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
import { DocumentMigrator, buildActiveMappings, buildTypesMappings } from '@kbn/core-saved-objects-migration-server-internal';
import { SavedObjectsRepository, SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import { Actions as SecurityActions } from '@kbn/security-authorization-core';
import { Locator } from '@kbn/share-plugin/common/url_service/locators/locator';
import { License } from '@kbn/licensing-plugin/common/license';
import { encodeFakeRequest } from '../request_codec';
import type { IslandSnapshot } from '../snapshot';
import { bridge, countFence, strict, toData } from './bridge';

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
export const createLogger = (context: string): Logger => {
  const log = (level: (typeof LEVELS)[number], message: unknown, meta?: unknown) => {
    if (LEVELS.indexOf(level) < minLevel) return;
    const text = typeof message === 'function' ? message() : message;
    const err = (meta as { error?: { stack_trace?: string } } | undefined)?.error?.stack_trace;
    process.stderr.write(
      `[t7a-isolate][${level.toUpperCase()}][${context}] ${
        text instanceof Error ? text.stack : String(text)
      }${err ? `\n${err}` : ''}\n`
    );
  };
  const logger: Logger = {
    trace: (m, x) => log('trace', m, x),
    debug: (m, x) => log('debug', m, x),
    info: (m, x) => log('info', m, x),
    warn: (m, x) => log('warn', m, x),
    error: (m, x) => log('error', m, x),
    fatal: (m, x) => log('fatal', m, x),
    log: (record) => log(record.level.id as (typeof LEVELS)[number], record.message),
    isLevelEnabled: (level) => LEVELS.indexOf(level as (typeof LEVELS)[number]) >= minLevel,
    get: (...ctx: string[]) => createLogger([context, ...ctx].join('.')),
  } as Logger;
  return logger;
};

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
const asyncFence =
  (what: string, result: unknown = undefined) =>
  async (..._args: unknown[]) => {
    countFence(what);
    return result;
  };
/** A router that records route registrations and never serves them (HTTP stays on main). */
const fencedRouter = (): object => {
  const register = fence('core.http.router.route');
  const versionedRoute = { addVersion: () => versionedRoute };
  const versioned = new Proxy(
    {},
    { get: () => (..._a: unknown[]) => (countFence('core.http.router.versioned'), versionedRoute) }
  );
  return new Proxy(
    { versioned, routerPath: '/', handleLegacyErrors: (h: unknown) => h },
    {
      get: (target, prop) =>
        prop in target ? (target as Obj)[prop as string] : register,
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
  const call = (method: string) => (...args: unknown[]) =>
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
}

export const createCoreLite = (
  snapshot: IslandSnapshot,
  es: ResearchEsCapability,
  localSo: boolean
): CoreLite => {
  const logger = createLogger('core');
  // REAL Core ClusterClient: same configureClient/transport/scoping code as main.
  const clusterClient = new ClusterClient({
    config: es.config,
    logger: logger.get('elasticsearch'),
    type: 'data',
    agentFactoryProvider: new AgentManager(logger.get('elasticsearch-agent'), {
      dnsCacheTtlInSeconds: 0,
    }),
    kibanaVersion: snapshot.kibanaVersion,
    getExecutionContext: () => es.executionContext,
    onRequestHandlerFactory: getRequestHandlerFactory(es.routing.enabled, false),
  });

  const basePath = {
    serverBasePath: snapshot.basePath.serverBasePath,
    publicBaseUrl: snapshot.basePath.publicBaseUrl,
    get: () => snapshot.basePath.serverBasePath,
    prepend: (path: string) => `${snapshot.basePath.serverBasePath}${path}`,
    remove: (path: string) => path,
    set: fence('core.http.basePath.set'),
  };

  const auditLogger = { log: fence('security.audit.log'), enabled: false, includeSavedObjectNames: false };
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
  let encryptionExtensionFactory: ((o: { typeRegistry: unknown; request: KibanaRequest }) => unknown) | undefined;
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
      migrateDocument: (document: never, options: never) => documentMigrator.migrate(document, options),
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
    ((request as KibanaRequest & { spaceId?: string }).spaceId ?? DEFAULT_SPACE_ID) === DEFAULT_SPACE_ID;
  const typesKnown = (types: string[]) => types.every((t) => typeRegistry.getType(t));

  const savedObjectsStart = strict('core.savedObjects', {
    createInternalRepository: (types?: string[]) =>
      localSo && typesKnown(types ?? [])
        ? (countFence('so.local.internalRepository'),
          localRepository(clusterClient.asInternalUser, types ?? []))
        : soFacade({ target: 'internal', types: types ?? [] }),
    getScopedClient: (request: KibanaRequest, options?: Obj) => {
      const excluded = (options?.excludedExtensions as string[] | undefined) ?? [];
      const hidden = (options?.includedHiddenTypes as string[] | undefined) ?? [];
      if (localSo && excluded.includes('security') && isDefaultSpace(request) && typesKnown(hidden)) {
        countFence('so.local.unsecuredScopedClient');
        // Mirrors security's SO client factory provider: with RBAC the repository runs as the
        // internal user (authorization is the security extension's job — excluded here).
        const esClient = snapshot.useRbacForFakeRequest
          ? clusterClient.asInternalUser
          : clusterClient.asScoped(request).asCurrentUser;
        return new SavedObjectsClient(localRepository(esClient, hidden, request));
      }
      return soFacade({ target: 'scoped', request: encodeFakeRequest(request), options: options ?? {} });
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
    executionContext: strict('core.executionContext', {
      withContext: (_ctx: unknown, fn: () => unknown) => fn(),
      get: () => undefined,
      getAsLabels: () => ({}),
      set: fence('core.executionContext.set'),
    }),
    analytics: strict('core.analytics', {
      reportEvent: fence('core.analytics.reportEvent'),
    }),
    http: strict('core.http', { basePath }),
    featureFlags: strict('core.featureFlags', {
      getBooleanValue: async (_k: string, d: boolean) => d,
      getStringValue: async (_k: string, d: string) => d,
      getNumberValue: async (_k: string, d: number) => d,
      getBooleanValue$: (_k: string, d: boolean) => of(d),
    }),
    pricing: strict('core.pricing', { isFeatureAvailable: () => true }),
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
        registerType: (type: { name: string }) => {
          countFence('core.savedObjects.registerType');
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
        // Main already gates on ES/SO availability before claiming tasks.
        core$: of({
          elasticsearch: { level: ServiceStatusLevels.available, summary: '' },
          savedObjects: { level: ServiceStatusLevels.available, summary: '' },
        }),
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
        withContext: (_ctx: unknown, fn: () => unknown) => fn(),
      }),
      featureFlags: strict('core.featureFlags(setup)', {
        setProvider: fence('core.featureFlags.setProvider'),
      }),
      pricing: strict('core.pricing(setup)', {
        registerProductFeatures: fence('core.pricing.registerProductFeatures'),
      }),
    });

  return { setupFor, start, clusterClient };
};

// ---------------------------------------------------------------------------------------------
// dependency plugin facades
// ---------------------------------------------------------------------------------------------
export interface TaskDefinitionCapture {
  readonly definitions: Map<string, { createTaskRunner: Fn } & Obj>;
}

export const createDepFacades = (snapshot: IslandSnapshot) => {
  const license = License.fromJSON(snapshot.license as never);
  const license$ = new BehaviorSubject(license);
  const licensingSetup = strict('licensing(setup)', {
    license$,
    featureUsage: strict('licensing.featureUsage(setup)', {
      register: fence('licensing.featureUsage.register'),
    }),
    refresh: async () => license,
  });
  const licensingStart = strict('licensing(start)', {
    license$,
    getLicense: async () => license,
    refresh: async () => license,
    featureUsage: strict('licensing.featureUsage(start)', {
      notifyUsage: fence('licensing.featureUsage.notifyUsage'),
    }),
  });

  const taskCapture: TaskDefinitionCapture = { definitions: new Map() };
  const BRIDGED_TM = new Set(['bulkSchedule', 'schedule']);
  const TM_READS = new Set(['aggregate', 'fetch', 'get']);
  const tmStartMethod =
    (method: string) =>
    async (...args: unknown[]) => {
      // Only runtime action enqueueing crosses; plugin-start maintenance scheduling is fenced
      // (main already scheduled those tasks).
      const first = args[0] as Obj | Obj[] | undefined;
      const taskTypes = (Array.isArray(first) ? first : [first]).map((t) => String(t?.taskType));
      if (BRIDGED_TM.has(method) && taskTypes.every((t) => t.startsWith('actions:'))) {
        return bridge('tm', method, toData(args) as never);
      }
      // Reads are side-effect free and needed at run time (e.g. actions queue-limit aggregate).
      if (TM_READS.has(method)) return bridge('tm', method, toData(args) as never);
      countFence(`taskManager.${method}`);
      return Array.isArray(first) ? first.map((t) => ({ ...t, id: 'fenced' })) : { id: 'fenced' };
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
    getSpaceId: (request: KibanaRequest) =>
      (request as KibanaRequest & { spaceId?: string }).spaceId ?? DEFAULT_SPACE_ID,
    isInDefaultSpace: (request: KibanaRequest) =>
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
  const spacesSetup = strict('spaces(setup)', { spacesService: strict('spaces.spacesService(setup)', spacesService) });
  const spacesStart = strict('spaces(start)', { spacesService: strict('spaces.spacesService', spacesService) });

  const securityActions = new SecurityActions();
  const auditLogger = { log: fence('security.audit.log'), enabled: false };
  const securityAudit = strict('security.audit', {
    asScoped: () => auditLogger,
    withoutRequest: auditLogger,
    getLogger: () => strict('security.audit.legacy', { log: fence('security.audit.legacy.log') }),
  });
  const checkPrivilegesDynamicallyWithRequest = (request: KibanaRequest) => async (privileges: unknown, opts?: unknown) =>
    bridge('security', 'checkPrivilegesDynamically', toData({ request: encodeFakeRequest(request), privileges, opts }) as never);
  const checkPrivilegesWithRequest = (request: KibanaRequest) => ({
    atSpace: async (spaceId: string, privileges: unknown, opts?: unknown) =>
      bridge('security', 'checkPrivilegesAtSpace', toData({ request: encodeFakeRequest(request), spaceId, privileges, opts }) as never),
    atSpaces: async (spaceIds: string[], privileges: unknown, opts?: unknown) =>
      bridge('security', 'checkPrivilegesAtSpaces', toData({ request: encodeFakeRequest(request), spaceIds, privileges, opts }) as never),
    globally: async (privileges: unknown, opts?: unknown) =>
      bridge('security', 'checkPrivilegesGlobally', toData({ request: encodeFakeRequest(request), privileges, opts }) as never),
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
    getKibanaFeatures: () => {
      throw new Error('T7A_UNSUPPORTED features.getKibanaFeatures (replicate snapshot when needed)');
    },
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
            ? new Locator({ id, getLocation: lazyUnsupported('locator.getLocation') } as never, locatorDeps as never)
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
                  bridge('mw', method, toData({ request: encodeFakeRequest(request), args }) as never)
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
}

/** Boots the real alerting execution plugin set inside this isolate. */
export const bootIsland = async (
  snapshot: IslandSnapshot,
  es: ResearchEsCapability,
  localSo = false
): Promise<Island> => {
  const t0 = performance.now();
  const core = createCoreLite(snapshot, es, localSo);
  const deps = createDepFacades(snapshot);
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
    const config = mod.config
      ? mod.config.schema.validate(snapshot.rawConfig[configKey] ?? {}, validationContext)
      : {};
    const initializerContext = {
      opaqueId: Symbol(configKey),
      env: {
        mode: { dev: snapshot.dev, prod: !snapshot.dev, name: snapshot.dev ? 'development' : 'production' },
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
  const eso = localSo ? await load('@kbn/encrypted-saved-objects-plugin/server', 'encryptedSavedObjects') : undefined;
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

  // ---- setup (Core's topological order) ----
  const esoStartDeferred = deferred<unknown>();
  if (eso) {
    const esoSetup = eso.setup(core.setupFor(Promise.resolve({}), esoStartDeferred.promise), {}) as object;
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

  return {
    taskCapture: deps.taskCapture,
    bootMs: performance.now() - t0,
    clusterClient: core.clusterClient,
  };
};
