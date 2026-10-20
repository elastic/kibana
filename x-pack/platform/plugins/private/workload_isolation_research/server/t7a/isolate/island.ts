/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A, variant B "real lifecycles"). Boots the REAL eventLog, actions,
 * stackConnectors, alerting and stackAlerts plugins (their public `plugin()` initialisers and
 * unmodified setup/start) inside an isolate, against a fenced Core-lite and dependency facades.
 *
 * Lever per facade (Track 7 catalogue):
 *  - Core ES: worker-local REAL Core ClusterClient rebuilt from the kit's captured internal config
 *    (Per-run capability bundle) — asScoped(fakeRequest) is Core's own algorithm, locally.
 *  - Core SO / ESO / uiSettings, spaces.getActiveSpace, security privilege checks, maintenance
 *    windows, TM bulkSchedule(actions:*): async bridges to MAIN (Per-run capability bundle).
 *  - license, basePath, indices, locators, config: Replicate read-mostly data (snapshot).
 *  - spaces id<->namespace, getSpaceId(fake request), security authz Actions strings, share
 *    Locator.getRedirectUrl: Co-locate callee code (pure functions/classes).
 *  - Registrations that only matter on main (routes, SO types, features, usage collectors, TM
 *    maintenance scheduling, analytics event types): FENCED (recorded no-ops).
 */

import { BehaviorSubject, of } from 'rxjs';
import { sanitizeTaskDefinitions } from '@kbn/task-manager-plugin/server/task_type_dictionary';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  ClusterClient,
  AgentManager,
  getRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { ResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import {
  DocumentMigrator,
  buildActiveMappings,
  buildTypesMappings,
} from '@kbn/core-saved-objects-migration-server-internal';
import {
  SavedObjectsRepository,
  SavedObjectsClient,
} from '@kbn/core-saved-objects-api-server-internal';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import { Actions as SecurityActions } from '@kbn/security-authorization-core';
import { Locator } from '@kbn/share-plugin/common/url_service/locators/locator';
import { License } from '@kbn/licensing-plugin/common/license';
import { map } from 'rxjs';
import { encodeFakeRequest } from '../request_codec';
import type { IslandSnapshot } from '../snapshot';
import { bridge, bridgeSync, countFence, edgeStats, fenceStats, runContext, strict, toData } from './bridge';
import {
  ALERTING_BOOT_ES_WRITE_ALLOW,
  createBootEsWriteFence,
  configKeyPaths,
  createEventForwarder,
  createExecutionContextService,
  createForwardingLogger,
  createPlatformReplica,
  currentExecutionContext,
  executionContextOpaqueId,
  decideTaskManagerCall,
  emptyPlatformReplicas,
  routeSavedObject,
  runInTmPhase,
  savedObjectCallOptions,
  verifyRegistryReadiness,
} from '../../capability_kit/worker_core';
import type { ForwardedEvent, ForwardedLog, SoTypeFingerprintInput } from '../../capability_kit/worker_core';

/* eslint-disable @typescript-eslint/no-var-requires */

type Fn = (...args: never[]) => unknown;
type Obj = Record<string, unknown>;

// ---------------------------------------------------------------------------------------------
// logging
// ---------------------------------------------------------------------------------------------
const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
const minLevel = LEVELS.indexOf(
  (process.env.KBN_RESEARCH_T7A_LOG_LEVEL as (typeof LEVELS)[number]) ?? 'warn'
);
const emitLog = (record: ForwardedLog): void => {
  if (!runContext.getStore()) return;
  void bridge('log', 'write', toData(record) as never).catch(() => undefined);
};
const resolveReplica = async <T>(kind: string, key: string, fallback: T, hit: T | undefined): Promise<T> => {
  if (hit !== undefined) return hit;
  const value = await bridge('replica', 'featureFlag', toData({ kind, key, fallback }) as never);
  return value as T;
};

const events = createEventForwarder((event: ForwardedEvent) => {
  if (!runContext.getStore()) return;
  void bridge(event.sink, 'write', toData(event.payload) as never).catch(() => undefined);
});

/** Forwards worker logs to main. Level filtering stays; records are not written to stderr. */
export const createLogger = (context: string): Logger =>
  createForwardingLogger(context, emitLog, LEVELS[minLevel]);

// ---------------------------------------------------------------------------------------------
// generic fences
// ---------------------------------------------------------------------------------------------
// Same implementation as spaces/server/lib/utils/namespace.ts (co-located pure functions).
const spaceIdToNamespace = (spaceId: string) => SavedObjectsUtils.namespaceStringToId(spaceId);
const namespaceToSpaceId = (namespace?: string) => SavedObjectsUtils.namespaceIdToString(namespace);

const fence =
  (what: string, result: unknown = undefined) =>
  (..._args: unknown[]) => {
    countFence(what);
    return result;
  };
/** A router that records route registrations and never serves them (HTTP stays on main). */
const fencedRouter = (): object => {
  const register = fence('core.http.router.route');
  const versionedRoute = { addVersion: () => versionedRoute };
  const versioned = new Proxy(
    {},
    {
      get:
        () =>
        (..._a: unknown[]) => (countFence('core.http.router.versioned'), versionedRoute),
    }
  );
  return new Proxy(
    { versioned, routerPath: '/', handleLegacyErrors: (h: unknown) => h },
    {
      get: (target, prop) => (prop in target ? (target as Obj)[prop as string] : register),
    }
  );
};

// ---------------------------------------------------------------------------------------------
// SO / uiSettings bridges (async; preserve MAIN's real security/ESO/migration wrappers)
// ---------------------------------------------------------------------------------------------
const SO_METHODS = [
  'get',
  'resolve',
  'bulkGet',
  'bulkResolve',
  'create',
  'bulkCreate',
  'update',
  'bulkUpdate',
  'delete',
  'bulkDelete',
  'find',
  'checkConflicts',
  'incrementCounter',
  'removeReferencesTo',
  'openPointInTimeForType',
  'closePointInTime',
  'collectMultiNamespaceReferences',
  'updateObjectsSpaces',
  'getCurrentNamespace',
] as const;

interface SoTarget {
  readonly target: 'internal' | 'scoped' | 'unsafeInternal';
  readonly types?: readonly string[];
  readonly request?: ReturnType<typeof encodeFakeRequest>;
  readonly options?: Obj;
  readonly namespace?: string;
}

const soFacade = (where: SoTarget): Obj => {
  const facade: Obj = {};
  for (const method of SO_METHODS) {
    facade[method] = (...args: unknown[]) =>
      bridge('so', method, toData({ ...where, args }) as Obj);
  }
  facade.asScopedToNamespace = (namespace: string) => soFacade({ ...where, namespace });
  facade.getSearchableNamespaces = async (namespaces: string[]) => namespaces;
  facade.createPointInTimeFinder = () => {
    throw new Error('T7A_UNSUPPORTED so.createPointInTimeFinder (needs streaming bridge)');
  };
  Object.defineProperty(facade, '__t7aTarget', { value: where, enumerable: false });
  return facade;
};

const uiSettingsFacade = (soClient: Obj): Obj => {
  const where = (soClient as { __t7aTarget?: SoTarget }).__t7aTarget;
  const call =
    (method: string) =>
    (...args: unknown[]) =>
      bridge('uiSettings', method, toData({ ...where, args }) as Obj);
  return { get: call('get'), getAll: call('getAll'), getUserProvided: call('getUserProvided') };
};

// ---------------------------------------------------------------------------------------------
// Core-lite
// ---------------------------------------------------------------------------------------------
export interface CoreLite {
  readonly setupFor: (pluginStart: Promise<unknown>, ownStart: Promise<unknown>) => object;
  readonly start: object;
  readonly clusterClient: ClusterClient;
  readonly esFence: ReturnType<typeof createBootEsWriteFence>;
  readonly registeredSoTypes: SoTypeFingerprintInput[];
  readonly platform: ReturnType<typeof createPlatformReplica>;
  readonly observePlatform: (token: string) => Promise<Record<string, unknown>>;
}

const statusLevel = (id: string) => {
  if (id === 'degraded') return ServiceStatusLevels.degraded;
  if (id === 'unavailable') return ServiceStatusLevels.unavailable;
  if (id === 'critical') return ServiceStatusLevels.critical;
  return ServiceStatusLevels.available;
};

export const createCoreLite = (
  snapshot: IslandSnapshot,
  es: ResearchEsCapability,
  localSo: boolean
): CoreLite => {
  const logger = createLogger('core');
  const platform = createPlatformReplica(snapshot.replicas ?? emptyPlatformReplicas());
  const esFence = createBootEsWriteFence({
    mode: process.env.KBN_RESEARCH_WC_ES_FENCE === 'record' ? 'record' : 'deny',
    allow: ALERTING_BOOT_ES_WRITE_ALLOW,
  });
  const executionContext = createExecutionContextService();
  const registeredSoTypes: SoTypeFingerprintInput[] = [];
  // REAL Core ClusterClient: same configureClient/transport/scoping code as main.
  const clusterClient = new ClusterClient({
    config: es.config,
    logger: logger.get('elasticsearch'),
    type: 'data',
    agentFactoryProvider: new AgentManager(logger.get('elasticsearch-agent'), {
      dnsCacheTtlInSeconds: 0,
    }),
    kibanaVersion: snapshot.kibanaVersion,
    getExecutionContext: () => {
      const header = executionContextOpaqueId();
      return header === 'unknownId' ? es.executionContext : header;
    },
    onRequestHandlerFactory: esFence.wrap(getRequestHandlerFactory(es.routing.enabled, false)),
  });

  const basePath = {
    serverBasePath: snapshot.basePath.serverBasePath,
    publicBaseUrl: snapshot.basePath.publicBaseUrl,
    get: () => snapshot.basePath.serverBasePath,
    prepend: (path: string) => `${snapshot.basePath.serverBasePath}${path}`,
    remove: (path: string) => path,
    set: fence('core.http.basePath.set'),
  };

  const auditLogger = {
    log: (event: unknown) => events.send('audit', event),
    enabled: true,
    includeSavedObjectNames: false,
  };
  const coreSecurityStart = strict('core.security', {
    authc: strict('core.security.authc', {
      // Fake (task) requests never carry an authenticated-user state on main either.
      getCurrentUser: (_request: KibanaRequest) => null,
      apiKeys: strict('core.security.authc.apiKeys', {
        uiam: snapshot.uiamEnabled ? ({} as object) : null,
        areAPIKeysEnabled: async () => true,
      }),
    }),
    audit: strict('core.security.audit', {
      asScoped: () => auditLogger,
      withoutRequest: auditLogger,
    }),
  });

  // ---- D (frontier 2): isolate-local SO repository + co-located ESO encryption extension ----
  // Types are the ones the island plugins register (their own types); migrate-on-read only; the
  // index migrations/readiness fence stays on main. Security/spaces extensions are NOT here, so
  // only internal repositories and security-excluded default-space scoped clients run locally.
  const typeRegistry = new SavedObjectTypeRegistry();
  let encryptionExtensionFactory:
    | ((o: { typeRegistry: unknown; request: KibanaRequest }) => unknown)
    | undefined;
  let migrator: IKibanaMigrator | undefined;
  const getMigrator = (): IKibanaMigrator => {
    if (migrator) return migrator;
    const documentMigrator = new DocumentMigrator({
      kibanaVersion: snapshot.kibanaVersion,
      typeRegistry,
      log: logger.get('migrator'),
    } as never);
    documentMigrator.prepareMigrations();
    const mappings = buildActiveMappings(buildTypesMappings(typeRegistry.getAllTypes()));
    migrator = {
      kibanaVersion: snapshot.kibanaVersion,
      prepareMigrations: () => documentMigrator.prepareMigrations(),
      getActiveMappings: () => mappings,
      getDocumentMigrator: () => documentMigrator,
      migrateDocument: (document: never, options: never) =>
        documentMigrator.migrate(document, options),
      getStatus$: () => of({ status: 'completed' as const }),
      runMigrations: async () => {
        throw new Error('t7a: index migrations belong to main');
      },
    } as unknown as IKibanaMigrator;
    return migrator;
  };
  // Mirrors Core: createInternalRepository() has NO extensions by default (ESO decrypts raw
  // attributes itself); scoped clients get the encryption extension for their request.
  const localRepository = (client: unknown, types: string[], request?: KibanaRequest) =>
    SavedObjectsRepository.createRepository(
      getMigrator(),
      typeRegistry,
      MAIN_SAVED_OBJECT_INDEX,
      client as never,
      logger.get('repository'),
      types,
      request
        ? {
            encryptionExtension: encryptionExtensionFactory?.({ typeRegistry, request }) as never,
            securityExtension: undefined,
            spacesExtension: undefined,
          }
        : undefined
    );
  const isDefaultSpace = (request: KibanaRequest) =>
    ((request as KibanaRequest & { spaceId?: string }).spaceId ?? DEFAULT_SPACE_ID) ===
    DEFAULT_SPACE_ID;
  const registeredNames = () => registeredSoTypes.map((type) => type.name);
  const optionBag = (method: string, args: unknown[]): object | undefined =>
    savedObjectCallOptions(method, args);
  const typesOf = (method: string, args: unknown[]): string[] => {
    const [first] = args;
    if (typeof first === 'string') return [first];
    if (Array.isArray(first)) {
      return first.map((item) =>
        item && typeof item === 'object' ? String((item as Obj).type) : String(item)
      );
    }
    if ((method === 'find' || method === 'checkConflicts') && first && typeof first === 'object') {
      const type = (first as Obj).type;
      return Array.isArray(type) ? type.map(String) : [String(type)];
    }
    return [];
  };
  const guardLocal = (
    repo: object,
    route: {
      target: 'internal' | 'scoped';
      defaultSpace: boolean;
      providerOptions?: object;
    },
    bridged: (method: string, args: unknown[]) => unknown
  ) =>
    new Proxy(repo, {
      get(target, prop) {
        if (typeof prop !== 'string') return Reflect.get(target, prop);
        const value = Reflect.get(target, prop);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          const types = typesOf(prop, args);
          if (
            routeSavedObject({
              localSo,
              target: route.target,
              types,
              registeredTypes: registeredNames(),
              operation: prop,
              providerOptions: route.providerOptions,
              options: optionBag(prop, args),
              defaultSpace: route.defaultSpace,
            }) === 'bridge'
          ) {
            return bridged(prop, args);
          }
          countFence(`so.local.${route.target}.${prop}`);
          return (value as (...inner: unknown[]) => unknown).apply(target, args);
        };
      },
    });

  const savedObjectsStart = strict('core.savedObjects', {
    createInternalRepository: (types?: string[]) => {
      const list = types ?? [];
      const concrete = list.length > 0 ? list : registeredNames();
      const facade = soFacade({ target: 'internal', types: list });
      const route = {
        target: 'internal' as const,
        types: concrete,
        defaultSpace: true,
      };
      if (
        routeSavedObject({
          localSo,
          registeredTypes: registeredNames(),
          ...route,
        }) !== 'local'
      ) {
        return facade;
      }
      countFence('so.local.internalRepository');
      return guardLocal(
        localRepository(clusterClient.asInternalUser, list) as object,
        { target: 'internal', defaultSpace: true },
        (method, args) => (facade[method] as (...inner: unknown[]) => unknown)(...args)
      );
    },
    getScopedClient: (request: KibanaRequest, options?: Obj) => {
      const hidden = (options?.includedHiddenTypes as string[] | undefined) ?? [];
      const facade = soFacade({
        target: 'scoped',
        request: encodeFakeRequest(request),
        options: options ?? {},
      });
      const providerOptions = options ?? {};
      const route = {
        target: 'scoped' as const,
        types: hidden,
        defaultSpace: isDefaultSpace(request),
        providerOptions,
      };
      if (
        routeSavedObject({
          localSo,
          registeredTypes: registeredNames(),
          ...route,
        }) !== 'local'
      ) {
        return facade;
      }
      countFence('so.local.unsecuredScopedClient');
      const esClient = snapshot.useRbacForFakeRequest
        ? clusterClient.asInternalUser
        : clusterClient.asScoped(request).asCurrentUser;
      return guardLocal(
        new SavedObjectsClient(localRepository(esClient, hidden, request)) as object,
        { target: 'scoped', defaultSpace: route.defaultSpace, providerOptions },
        (method, args) => (facade[method] as (...inner: unknown[]) => unknown)(...args)
      );
    },
    getTypeRegistry: () => typeRegistry,
    getUnsafeInternalClient: (options?: Obj) =>
      soFacade({ target: 'unsafeInternal', options: options ?? {} }),
    getAllIndices: () => [...snapshot.allIndices],
    getDefaultIndex: () => snapshot.defaultIndex,
  });

  const start = strict('coreStart', {
    elasticsearch: strict('core.elasticsearch', { client: clusterClient }),
    savedObjects: savedObjectsStart,
    uiSettings: strict('core.uiSettings', { asScopedToClient: uiSettingsFacade }),
    security: coreSecurityStart,
    userProfile: strict('core.userProfile', {}),
    executionContext: strict('core.executionContext', executionContext),
    analytics: strict('core.analytics', {
      reportEvent: (event: unknown) => events.send('analytics', event),
    }),
    http: strict('core.http', { basePath }),
    featureFlags: strict('core.featureFlags', {
      getBooleanValue: (key: string, fallback: boolean) =>
        resolveReplica('boolean', key, fallback, platform.booleanFlag(key)),
      getStringValue: (key: string, fallback: string) =>
        resolveReplica('string', key, fallback, platform.stringFlag(key)),
      getNumberValue: (key: string, fallback: number) =>
        resolveReplica('number', key, fallback, platform.numberFlag(key)),
      getBooleanValue$: (key: string, fallback: boolean) => platform.booleanFlag$(key, fallback),
      getStringValue$: (key: string, fallback: string) => platform.stringFlag$(key, fallback),
      getNumberValue$: (key: string, fallback: number) => platform.numberFlag$(key, fallback),
    }),
    pricing: strict('core.pricing', {
      isFeatureAvailable: (featureId: string) => {
        const hit = platform.price(featureId);
        if (hit !== undefined) return hit;
        const remembered = platform.remembered(`price:${featureId}`);
        if (typeof remembered === 'boolean') return remembered;
        const value = bridgeSync<boolean>('replica', 'pricing', { featureId } as never);
        platform.remember(`price:${featureId}`, value);
        return value;
      },
      getActiveProduct: () => platform.activeProduct(),
    }),
  });

  const setupFor = (pluginsStart: Promise<unknown>, ownStart: Promise<unknown>) =>
    strict('coreSetup', {
      getStartServices: () => Promise.all([Promise.resolve(start), pluginsStart, ownStart]),
      http: strict('core.http(setup)', {
        createRouter: fencedRouter,
        registerRouteHandlerContext: fence('core.http.registerRouteHandlerContext'),
        basePath,
        getServerInfo: () => ({ hostname: 'localhost', port: 0, name: 't7a', protocol: 'http' }),
      }),
      savedObjects: strict('core.savedObjects(setup)', {
        registerType: (type: SoTypeFingerprintInput) => {
          countFence('core.savedObjects.registerType');
          registeredSoTypes.push({
            name: type.name,
            mappings: type.mappings,
            namespaceType: type.namespaceType,
            hidden: type.hidden,
            indexPattern: type.indexPattern,
          });
          if (localSo) typeRegistry.registerType(type as never);
        },
        setEncryptionExtension: (factory: typeof encryptionExtensionFactory) => {
          encryptionExtensionFactory = factory;
        },
        getDefaultIndex: () => snapshot.defaultIndex,
        getKibanaIndex: () => snapshot.defaultIndex,
        setClientFactoryProvider: fence('core.savedObjects.setClientFactoryProvider'),
        addClientWrapper: fence('core.savedObjects.addClientWrapper'),
      }),
      status: strict('core.status', {
        core$: platform.status$.pipe(
          map((value) => ({
            elasticsearch: { level: statusLevel(value.elasticsearch), summary: '' },
            savedObjects: { level: statusLevel(value.savedObjects), summary: '' },
          }))
        ),
        set: fence('core.status.set'),
      }),
      capabilities: strict('core.capabilities', {
        registerProvider: fence('core.capabilities.registerProvider'),
        registerSwitcher: fence('core.capabilities.registerSwitcher'),
      }),
      analytics: strict('core.analytics(setup)', {
        registerEventType: fence('core.analytics.registerEventType'),
        reportEvent: fence('core.analytics.reportEvent'),
      }),
      uiSettings: strict('core.uiSettings(setup)', {
        register: fence('core.uiSettings.register'),
        registerGlobal: fence('core.uiSettings.registerGlobal'),
      }),
      docLinks: new Proxy({}, { get: () => new Proxy({}, { get: () => '' }) }),
      deprecations: strict('core.deprecations', {
        registerDeprecations: fence('core.deprecations.registerDeprecations'),
      }),
      elasticsearch: strict('core.elasticsearch(setup)', {
        setUnauthorizedErrorHandler: fence('core.elasticsearch.setUnauthorizedErrorHandler'),
      }),
      security: strict('core.security(setup)', {
        registerSecurityDelegate: fence('core.security.registerSecurityDelegate'),
      }),
      executionContext: strict('core.executionContext(setup)', {
        withContext: (ctx: Record<string, unknown>, fn: () => unknown) =>
          executionContext.withContext(ctx, fn),
      }),
      featureFlags: strict('core.featureFlags(setup)', {
        setProvider: fence('core.featureFlags.setProvider'),
      }),
      pricing: strict('core.pricing(setup)', {
        registerProductFeatures: fence('core.pricing.registerProductFeatures'),
      }),
    });

  const safeBridge = async (capability: string, operation: string, payload: unknown) => {
    try {
      await bridge(capability, operation, toData(payload) as never);
      return null;
    } catch (error) {
      return (error as Error).name || 'Error';
    }
  };
  const observePlatform = async (token: string) => {
    const ctx = currentExecutionContext()?.toJSON();
    const id = ctx?.id ? String(ctx.id) : '';
    const opaqueId = executionContextOpaqueId();
    const message = `worker-core-live token=${token} ctx=${id}`;
    const logError = await safeBridge('log', 'write', {
      level: 'info',
      context: 'worker-core',
      message,
    });
    logger.info(message);
    const auditEvent = {
      message: 'worker-core live probe',
      event: { action: 'access', outcome: 'unknown' },
    };
    events.send('audit', auditEvent);
    const auditError = await safeBridge('audit', 'write', auditEvent);
    const analyticsEvent = { eventType: 'worker_core_live', properties: { token } };
    events.send('analytics', analyticsEvent);
    const analyticsError = await safeBridge('analytics', 'write', analyticsEvent);
    events.send('usage.collector.fetch', { collector: 'worker-core' });
    const localBefore = fenceStats.get('so.local.internal.get') ?? 0;
    const getBefore = edgeStats.get('so.get')?.calls ?? 0;
    const pitBefore = edgeStats.get('so.openPointInTimeForType')?.calls ?? 0;
    let getError: string | undefined;
    let pitError: string | undefined;
    try {
      const repo = savedObjectsStart.createInternalRepository(['alert']) as {
        get: (type: string, id: string) => Promise<unknown>;
        openPointInTimeForType: (types: string[]) => Promise<{ id?: string }>;
        closePointInTime: (pitId: string) => Promise<unknown>;
      };
      try {
        await repo.get('alert', 'worker-core-missing');
      } catch (error) {
        getError = (error as Error).name || 'Error';
      }
      try {
        const pit = await repo.openPointInTimeForType(['alert']);
        if (pit?.id) await repo.closePointInTime(pit.id);
      } catch (error) {
        pitError = (error as Error).name || 'Error';
      }
    } catch (error) {
      getError = (error as Error).name || 'Error';
    }
    return {
      token,
      executionContextId: id || null,
      executionContextOpaqueId: opaqueId,
      generations: platform.generation(),
      probeFlag: platform.booleanFlag('workerCore.liveProbe') ?? null,
      activeProduct: platform.activeProduct() ?? null,
      featureCount: platform.features().length,
      configPlugins: Object.keys(snapshot.effectiveConfig ?? {}),
      configKeyCount: configKeyPaths(snapshot.effectiveConfig ?? {}).length,
      exclusions: events.excluded(),
      logError,
      auditError,
      analyticsError,
      so: {
        localGetDelta: (fenceStats.get('so.local.internal.get') ?? 0) - localBefore,
        getBridgeDelta: (edgeStats.get('so.get')?.calls ?? 0) - getBefore,
        pitBridgeDelta: (edgeStats.get('so.openPointInTimeForType')?.calls ?? 0) - pitBefore,
        getError: getError ?? null,
        pitError: pitError ?? null,
      },
    };
  };

  return { setupFor, start, clusterClient, esFence, registeredSoTypes, platform, observePlatform };
};

// ---------------------------------------------------------------------------------------------
// dependency plugin facades
// ---------------------------------------------------------------------------------------------
export interface TaskDefinitionCapture {
  readonly definitions: Map<string, { createTaskRunner: Fn } & Obj>;
}

export const createDepFacades = (
  snapshot: IslandSnapshot,
  platform: ReturnType<typeof createPlatformReplica>
) => {
  const toLicense = (value: Record<string, unknown>) => {
    const source = Object.keys(value).length > 0 ? value : (snapshot.license as Record<string, unknown>);
    return License.fromJSON(source as never);
  };
  const license$ = new BehaviorSubject(toLicense(platform.license$.getValue()));
  platform.license$.subscribe((value) => license$.next(toLicense(value)));
  const licensingSetup = strict('licensing(setup)', {
    license$,
    featureUsage: strict('licensing.featureUsage(setup)', {
      register: fence('licensing.featureUsage.register'),
    }),
    refresh: async () => license$.getValue(),
  });
  const licensingStart = strict('licensing(start)', {
    license$,
    getLicense: async () => license$.getValue(),
    refresh: async () => license$.getValue(),
    featureUsage: strict('licensing.featureUsage(start)', {
      notifyUsage: fence('licensing.featureUsage.notifyUsage'),
    }),
  });

  const taskCapture: TaskDefinitionCapture = { definitions: new Map() };
  const tmStartMethod =
    (method: string) =>
    async (...args: unknown[]) => {
      const first = args[0] as Obj | Obj[] | undefined;
      if (decideTaskManagerCall(method) === 'bridge') {
        return bridge('tm', method, toData(args) as never);
      }
      countFence(`taskManager.${method}`);
      return Array.isArray(first) ? first.map((item) => ({ ...item, id: 'fenced' })) : { id: 'fenced' };
    };
  const taskManagerSetup = strict('taskManager(setup)', {
    index: snapshot.taskManagerIndex,
    registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Fn } & Obj>) => {
      for (const [type, def] of Object.entries(defs)) taskCapture.definitions.set(type, def);
    },
    addMiddleware: fence('taskManager.addMiddleware'),
    registerCanEncryptedSavedObjects: fence('taskManager.registerCanEncryptedSavedObjects'),
  });
  const taskManagerStart = strict(
    'taskManager(start)',
    Object.fromEntries(
      [
        'schedule',
        'bulkSchedule',
        'ensureScheduled',
        'removeIfExists',
        'bulkRemove',
        'bulkDisable',
        'bulkEnable',
        'bulkUpdateSchedules',
        'bulkUpdateState',
        'runSoon',
        'get',
        'fetch',
        'aggregate',
      ].map((m) => [m, tmStartMethod(m)])
    )
  );

  const esoClient = (options: Obj) =>
    strict('encryptedSavedObjects.client', {
      getDecryptedAsInternalUser: (type: string, id: string, opts?: Obj) =>
        bridge('eso', 'getDecryptedAsInternalUser', toData({ options, type, id, opts }) as Obj),
      createPointInTimeFinderDecryptedAsInternalUser: () => {
        throw new Error('T7A_UNSUPPORTED eso.createPointInTimeFinderDecryptedAsInternalUser');
      },
    });
  const esoSetup = strict('encryptedSavedObjects(setup)', {
    canEncrypt: true,
    registerType: fence('encryptedSavedObjects.registerType'),
    // Migrations are registered with SO types; those types live on main (fenced registerType).
    createMigration: () => (doc: unknown) => doc,
    createModelVersion: (opts: { modelVersion: unknown }) => opts.modelVersion,
  });
  const esoStart = strict('encryptedSavedObjects(start)', {
    getClient: (options: Obj = {}) => esoClient(options),
    isEncryptionError: () => false,
  });

  const spacesService = {
    spaceIdToNamespace,
    namespaceToSpaceId,
    // Fake requests carry their space; identical to main's implementation.
    getSpaceId: (request: KibanaRequest): string =>
      (request as KibanaRequest & { spaceId?: string }).spaceId ?? (DEFAULT_SPACE_ID as string),
    isInDefaultSpace: (request: KibanaRequest): boolean =>
      ((request as KibanaRequest & { spaceId?: string }).spaceId ?? DEFAULT_SPACE_ID) ===
      DEFAULT_SPACE_ID,
    getActiveSpace: (request: KibanaRequest) =>
      bridge('spaces', 'getActiveSpace', { request: encodeFakeRequest(request) } as never),
    createSpacesClient: (request: KibanaRequest) =>
      strict('spaces.client', {
        get: (id: string) =>
          bridge('spaces', 'get', { request: encodeFakeRequest(request), id } as never),
      }),
  };
  const spacesSetup = strict('spaces(setup)', {
    spacesService: strict('spaces.spacesService(setup)', spacesService),
  });
  const spacesStart = strict('spaces(start)', {
    spacesService: strict('spaces.spacesService', spacesService),
  });

  const securityActions = new SecurityActions();
  const auditLogger = {
    log: (event: unknown) => events.send('audit', event),
    enabled: true,
  };
  const securityAudit = strict('security.audit', {
    asScoped: () => auditLogger,
    withoutRequest: auditLogger,
    getLogger: () => strict('security.audit.legacy', { log: fence('security.audit.legacy.log') }),
  });
  const checkPrivilegesDynamicallyWithRequest =
    (request: KibanaRequest) => async (privileges: unknown, opts?: unknown) =>
      bridge(
        'security',
        'checkPrivilegesDynamically',
        toData({ request: encodeFakeRequest(request), privileges, opts }) as never
      );
  const checkPrivilegesWithRequest = (request: KibanaRequest) => ({
    atSpace: async (spaceId: string, privileges: unknown, opts?: unknown) =>
      bridge(
        'security',
        'checkPrivilegesAtSpace',
        toData({ request: encodeFakeRequest(request), spaceId, privileges, opts }) as never
      ),
    atSpaces: async (spaceIds: string[], privileges: unknown, opts?: unknown) =>
      bridge(
        'security',
        'checkPrivilegesAtSpaces',
        toData({ request: encodeFakeRequest(request), spaceIds, privileges, opts }) as never
      ),
    globally: async (privileges: unknown, opts?: unknown) =>
      bridge(
        'security',
        'checkPrivilegesGlobally',
        toData({ request: encodeFakeRequest(request), privileges, opts }) as never
      ),
  });
  const authz = strict('security.authz', {
    actions: securityActions,
    checkPrivilegesDynamicallyWithRequest,
    checkPrivilegesWithRequest,
    mode: { useRbacForRequest: () => snapshot.useRbacForFakeRequest },
  });
  const securitySetup = strict('security(setup)', {
    audit: securityAudit,
    authz,
    license: strict('security.license', {
      isEnabled: () => snapshot.securityEnabled,
      getFeatures: () => ({}),
    }),
  });
  const securityStart = strict('security(start)', {
    authz,
    audit: securityAudit,
    authc: strict('security.authc', {
      getCurrentUser: () => null,
      apiKeys: strict('security.authc.apiKeys', { areAPIKeysEnabled: async () => true }),
    }),
  });

  const features = strict('features', {
    registerKibanaFeature: fence('features.registerKibanaFeature'),
    registerElasticsearchFeature: fence('features.registerElasticsearchFeature'),
    getKibanaFeatures: () => platform.features(),
  });

  const lazyUnsupported = (name: string) => () => {
    throw new Error(`T7A_UNSUPPORTED ${name} (not on the .es-query ES|QL path)`);
  };
  const dataSetup = strict('data(setup)', {
    search: strict('data.search(setup)', {
      searchSource: strict('data.search.searchSource(setup)', { getAllMigrations: () => ({}) }),
    }),
  });
  const dataStart = strict('data(start)', {
    search: strict('data.search(start)', {
      asScoped: lazyUnsupported('data.search.asScoped'),
      searchSource: strict('data.search.searchSource', {
        asScoped: lazyUnsupported('data.search.searchSource.asScoped'),
      }),
    }),
  });
  const dataViewsStart = strict('dataViews(start)', {
    dataViewsServiceFactory: lazyUnsupported('dataViews.dataViewsServiceFactory'),
  });

  const locatorDeps = {
    baseUrl: snapshot.basePath.publicBaseUrl || snapshot.basePath.serverBasePath,
    version: snapshot.kibanaVersion,
    getUrl: async () => {
      throw new Error('Locator .getUrl() currently is not supported on the server.');
    },
    navigate: async () => {
      throw new Error('Locator .navigate() currently is not supported on the server.');
    },
  };
  const shareStart = strict('share(start)', {
    url: strict('share.url', {
      locators: strict('share.url.locators', {
        get: (id: string) =>
          snapshot.locatorIds.includes(id)
            ? new Locator(
                { id, getLocation: lazyUnsupported('locator.getLocation') } as never,
                locatorDeps as never
              )
            : undefined,
      }),
    }),
  });

  const maintenanceWindowsStart = strict('maintenanceWindows(start)', {
    getMaintenanceWindowClientWithoutAuth: (request: KibanaRequest) =>
      new Proxy(
        {},
        {
          get: (_t, method) =>
            typeof method === 'string'
              ? (...args: unknown[]) =>
                  bridge(
                    'mw',
                    method,
                    toData({ request: encodeFakeRequest(request), args }) as never
                  )
              : undefined,
        }
      ),
  });

  const kqlSetup = strict('kql(setup)', {
    autocomplete: strict('kql.autocomplete', {
      getInitializerContextConfig: () => ({ create: () => of({}) }),
    }),
  });

  return {
    taskCapture,
    licensingSetup,
    licensingStart,
    taskManagerSetup,
    taskManagerStart,
    esoSetup,
    esoStart,
    spacesSetup,
    spacesStart,
    securitySetup,
    securityStart,
    features,
    dataSetup,
    dataStart,
    dataViewsStart,
    shareStart,
    maintenanceWindowsStart,
    kqlSetup,
  };
};

// ---------------------------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------------------------
interface PluginInstance {
  setup: (core: object, deps: object) => unknown;
  start: (core: object, deps: object) => unknown;
}
interface PluginModule {
  plugin: (ctx: object) => Promise<PluginInstance>;
  config?: { schema: { validate: (raw: unknown, ctx: object) => unknown } };
}

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

export interface Island {
  readonly taskCapture: TaskDefinitionCapture;
  readonly bootMs: number;
  readonly clusterClient: ClusterClient;
  readonly esWrites: ReturnType<ReturnType<typeof createBootEsWriteFence>['summary']>;
  readonly esWriteRecords: ReadonlyArray<{ method: string; path: string }>;
  readonly registeredSoTypes: readonly string[];
  readonly taskDefinitionMeta: ReadonlyArray<{
    type: string;
    timeout: string;
    maxAttempts?: number;
    cost?: string | number;
    priority?: string | number;
    stateSchemaVersions: number[];
  }>;
  readonly applyReplicas: (next: IslandSnapshot) => void;
  readonly observePlatform: (token: string) => Promise<Record<string, unknown>>;
  readonly platform: ReturnType<typeof createPlatformReplica>;
}

/** Boots the real alerting execution plugin set inside this isolate. */
export const bootIsland = async (
  snapshot: IslandSnapshot,
  es: ResearchEsCapability,
  localSo = false
): Promise<Island> => {
  const t0 = performance.now();
  const core = createCoreLite(snapshot, es, localSo);
  const deps = createDepFacades(snapshot, core.platform);
  const validationContext = {
    dev: snapshot.dev,
    prod: !snapshot.dev,
    serverless: snapshot.buildFlavor === 'serverless',
    dist: snapshot.dist,
    version: snapshot.kibanaVersion,
    branch: 'main',
    buildNum: snapshot.buildNum,
    buildSha: snapshot.buildSha,
    buildShaShort: snapshot.buildSha.slice(0, 12),
  };

  const load = async (pkg: string, configKey: string) => {
    const mod = require(pkg) as PluginModule;
    const provided = snapshot.effectiveConfig?.[configKey];
    const config =
      provided !== undefined
        ? provided
        : mod.config
        ? mod.config.schema.validate(snapshot.rawConfig[configKey] ?? {}, validationContext)
        : {};
    const initializerContext = {
      opaqueId: Symbol(configKey),
      env: {
        mode: {
          dev: snapshot.dev,
          prod: !snapshot.dev,
          name: snapshot.dev ? 'development' : 'production',
        },
        packageInfo: {
          version: snapshot.kibanaVersion,
          branch: 'main',
          buildNum: snapshot.buildNum,
          buildSha: snapshot.buildSha,
          buildShaShort: snapshot.buildSha.slice(0, 12),
          buildDate: new Date(0),
          dist: snapshot.dist,
          buildFlavor: snapshot.buildFlavor,
        },
        instanceUuid: snapshot.instanceUuid,
        configs: [],
      },
      logger: { get: (...ctx: string[]) => createLogger([configKey, ...ctx].join('.')) },
      config: {
        get: () => config,
        create: () => of(config),
        legacy: { globalConfig$: of({}), get: () => ({}) },
      },
      node: { roles: { backgroundTasks: true, ui: false, migrator: false } },
    };
    const instance = await mod.plugin(initializerContext);
    return instance;
  };

  // D: co-locate the REAL ESO plugin (same config schema → same key in dev; prod needs a key handover).
  const eso = localSo
    ? await load('@kbn/encrypted-saved-objects-plugin/server', 'encryptedSavedObjects')
    : undefined;
  const eventLog = await load('@kbn/event-log-plugin/server', 'eventLog');
  const actions = await load('@kbn/actions-plugin/server', 'actions');
  const stackConnectors = await load('@kbn/stack-connectors-plugin/server', 'stackConnectors');
  const alerting = await load('@kbn/alerting-plugin/server', 'alerting');
  const stackAlerts = await load('@kbn/stack-alerts-plugin/server', 'stackAlerts');

  const starts = {
    eventLog: deferred<unknown>(),
    actions: deferred<unknown>(),
    stackConnectors: deferred<unknown>(),
    alerting: deferred<unknown>(),
    stackAlerts: deferred<unknown>(),
  };
  const depsStart = {
    eventLog: deferred<object>(),
    actions: deferred<object>(),
    stackConnectors: deferred<object>(),
    alerting: deferred<object>(),
    stackAlerts: deferred<object>(),
  };

  await runInTmPhase('boot', async () => {
  // ---- setup (Core's topological order) ----
  const esoStartDeferred = deferred<unknown>();
  if (eso) {
    const esoSetup = eso.setup(
      core.setupFor(Promise.resolve({}), esoStartDeferred.promise),
      {}
    ) as object;
    (deps as { esoSetup: object }).esoSetup = esoSetup;
  }
  const eventLogSetup = eventLog.setup(
    core.setupFor(depsStart.eventLog.promise, starts.eventLog.promise),
    { spaces: deps.spacesSetup }
  ) as object;
  const actionsSetup = actions.setup(
    core.setupFor(depsStart.actions.promise, starts.actions.promise),
    {
      licensing: deps.licensingSetup,
      taskManager: deps.taskManagerSetup,
      encryptedSavedObjects: deps.esoSetup,
      eventLog: eventLogSetup,
      features: deps.features,
      spaces: deps.spacesSetup,
      security: deps.securitySetup,
    }
  ) as object;
  stackConnectors.setup(
    core.setupFor(depsStart.stackConnectors.promise, starts.stackConnectors.promise),
    { actions: actionsSetup }
  );
  const alertingSetup = alerting.setup(
    core.setupFor(depsStart.alerting.promise, starts.alerting.promise),
    {
      actions: actionsSetup,
      data: deps.dataSetup,
      dataViews: {},
      share: {},
      encryptedSavedObjects: deps.esoSetup,
      eventLog: eventLogSetup,
      features: deps.features,
      kibanaUtils: {},
      licensing: deps.licensingSetup,
      taskManager: deps.taskManagerSetup,
      management: {},
      kql: deps.kqlSetup,
      embeddable: {},
      security: deps.securitySetup,
      spaces: deps.spacesSetup,
    }
  ) as object;
  stackAlerts.setup(core.setupFor(depsStart.stackAlerts.promise, starts.stackAlerts.promise), {
    alerting: alertingSetup,
    features: deps.features,
  });

  // ---- start ----
  if (eso) {
    const esoStart = eso.start(core.start, {}) as object;
    esoStartDeferred.resolve(esoStart);
    (deps as { esoStart: object }).esoStart = esoStart;
  }
  depsStart.eventLog.resolve({ spaces: deps.spacesStart });
  const eventLogStart = eventLog.start(core.start, { spaces: deps.spacesStart }) as object;
  starts.eventLog.resolve(eventLogStart);

  const actionsDeps = {
    licensing: deps.licensingStart,
    taskManager: deps.taskManagerStart,
    encryptedSavedObjects: deps.esoStart,
    eventLog: eventLogStart,
    spaces: deps.spacesStart,
    security: deps.securityStart,
    features: deps.features,
  };
  depsStart.actions.resolve(actionsDeps);
  const actionsStart = actions.start(core.start, actionsDeps) as object;
  starts.actions.resolve(actionsStart);

  const connectorsDeps = {
    encryptedSavedObjects: deps.esoStart,
    actions: actionsStart,
    spaces: deps.spacesStart,
    licensing: deps.licensingStart,
  };
  depsStart.stackConnectors.resolve(connectorsDeps);
  starts.stackConnectors.resolve(stackConnectors.start(core.start, connectorsDeps));

  const alertingDeps = {
    actions: actionsStart,
    data: deps.dataStart,
    dataViews: deps.dataViewsStart,
    share: deps.shareStart,
    encryptedSavedObjects: deps.esoStart,
    eventLog: eventLogStart,
    features: deps.features,
    licensing: deps.licensingStart,
    taskManager: deps.taskManagerStart,
    security: deps.securityStart,
    spaces: deps.spacesStart,
    maintenanceWindows: deps.maintenanceWindowsStart,
  };
  depsStart.alerting.resolve(alertingDeps);
  starts.alerting.resolve(alerting.start(core.start, alertingDeps));

  const stackAlertsDeps = { alerting: {}, triggersActionsUi: { data: {} } };
  depsStart.stackAlerts.resolve(stackAlertsDeps);
  starts.stackAlerts.resolve(stackAlerts.start(core.start, stackAlertsDeps));
  });
  const eventLogContext = (
    eventLog as { esContext?: { initialized?: boolean; waitTillReady?: () => Promise<unknown> } }
  ).esContext;
  const alertsInit = (
    alerting as { alertsService?: { commonInitPromise?: Promise<unknown> } }
  ).alertsService?.commonInitPromise;
  await core.esFence.awaitInstallers([
    eventLogContext?.initialized ? eventLogContext.waitTillReady?.() : undefined,
    alertsInit,
  ]);
  if (localSo) verifyRegistryReadiness(snapshot.readiness, core.registeredSoTypes);

  return {
    taskCapture: deps.taskCapture,
    bootMs: performance.now() - t0,
    clusterClient: core.clusterClient,
    esWrites: core.esFence.summary(),
    esWriteRecords: core.esFence
      .records()
      .filter((record) => record.write && record.phase === 'boot')
      .map((record) => ({ method: record.method, path: record.path })),
    registeredSoTypes: core.registeredSoTypes.map((type) => type.name),
    taskDefinitionMeta: sanitizeTaskDefinitions(
      Object.fromEntries(deps.taskCapture.definitions) as never
    ).map((def) => ({
      type: def.type,
      timeout: String(def.timeout ?? ''),
      maxAttempts: typeof def.maxAttempts === 'number' ? def.maxAttempts : undefined,
      cost: def.cost as string | number | undefined,
      priority: def.priority as string | number | undefined,
      stateSchemaVersions: Object.keys(def.stateSchemaByVersion ?? {})
        .map(Number)
        .sort((left, right) => left - right),
    })),
    applyReplicas: (next: IslandSnapshot) => {
      if (next.replicas) core.platform.apply(next.replicas);
      if (localSo && next.readiness) verifyRegistryReadiness(next.readiness, core.registeredSoTypes);
    },
    observePlatform: (token: string) => core.observePlatform(token),
    platform: core.platform,
  };
};
