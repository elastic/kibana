/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). MAIN side of the alerting class pool.
 * - Task Manager keeps polling/claiming/leases/result persistence on main.
 * - For `alerting:.es-query` and `actions:.index` the research TM seam swaps the runner for a stub
 *   that dispatches the task to the kit ExecutionHost (`alerting` class, thread or process).
 * - The isolate boots the real plugin set (island.ts); its async bridges land here and are served
 *   by main's REAL Core/plugin services (security/ESO/SO wrappers preserved).
 * Toggled at runtime (mode main|offmain) so A/B windows share one boot.
 */

import { performance } from 'perf_hooks';
import type { CoreStart, KibanaRequest, Logger, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { setResearchRunnerOverride } from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { captureResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import { ExecutionHost, ModuleRegistry } from '../capability_kit';
import type { Binding, CodecInput, Crossing, Outcome } from '../capability_kit';
import { decodeFakeRequest, encodeFakeRequest } from './request_codec';
import type { FakeRequestDescriptor } from './request_codec';
import { decodeRunResult, decodeTaskError } from './task_codec';
import type { WireRunResult, WireTaskError } from './task_codec';
import type { IslandSnapshot } from './snapshot';
import { toData } from './isolate/bridge';

export const OFFMAIN_TASK_TYPES = new Set(['alerting:.es-query', 'actions:.index']);
const WORKLOAD_CLASS = 'alerting';

type Obj = Record<string, unknown>;
type AnyFn = (...args: unknown[]) => unknown;

export interface T7aDeps {
  readonly core: CoreStart;
  readonly taskManager: TaskManagerStartContract;
  readonly encryptedSavedObjects?: { getClient: (o?: Obj) => Obj };
  readonly spaces?: { spacesService: Obj };
  readonly security?: { authz: Obj };
  readonly maintenanceWindows?: { getMaintenanceWindowClientWithoutAuth: (r: KibanaRequest) => Obj };
  readonly licensing?: { license$: { subscribe: (fn: (l: { toJSON: () => Obj }) => void) => { unsubscribe: () => void } } };
}

export interface T7aConfig {
  readonly mode: 'main' | 'offmain';
  readonly transport: 'thread' | 'process';
  readonly slots: number;
  readonly concurrency: number;
  readonly abortGraceMs: number;
  readonly deadlineMs: number;
}

interface EdgeAgg {
  calls: number;
  bytesIn: number;
  bytesOut: number;
  handlerMs: number;
  lever: string;
  generic: boolean;
}

const asBinding = (handler: (op: string, args: Obj) => Promise<unknown>): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args) => {
    // Errors are thrown: kit 0.1.4 typed error codecs rebuild Boom / SO helper errors.
    return toData(await handler(operation, (args ?? {}) as Obj));
  },
});

/** MAIN-side controller for the alerting class pool. */
export class T7aController {
  private config: T7aConfig = {
    mode: 'main',
    transport: 'thread',
    slots: 1,
    concurrency: 10,
    abortGraceMs: 2000,
    deadlineMs: 10 * 60_000,
  };
  private host?: ExecutionHost;
  private readonly registry: ModuleRegistry;
  private readonly entry: string;
  private readonly edges = new Map<string, EdgeAgg>();
  private readonly outcomes = new Map<string, number>();
  private readonly runs: Obj[] = [];
  private snapshot?: IslandSnapshot;
  private license?: Obj;
  private esCapability?: Obj;

  constructor(
    private readonly deps: T7aDeps,
    private readonly env: PluginInitializerContext['env'],
    private readonly logger: Logger
  ) {
    this.entry = require.resolve('./isolate/entry');
    this.registry = new ModuleRegistry(new Set([this.entry]));
    for (const type of OFFMAIN_TASK_TYPES) this.registry.register(type, this.entry, 'runTask');
    deps.licensing?.license$.subscribe((license) => {
      this.license = license.toJSON();
      this.snapshot = undefined;
    });
    setResearchRunnerOverride((taskType, context) =>
      this.config.mode === 'offmain' && OFFMAIN_TASK_TYPES.has(taskType)
        ? this.createStub(taskType, context)
        : undefined
    );
  }

  public getConfig(): T7aConfig {
    return this.config;
  }

  public async configure(next: Partial<T7aConfig>): Promise<T7aConfig> {
    const previous = this.config;
    this.config = { ...previous, ...next };
    const hostChanged =
      previous.transport !== this.config.transport ||
      previous.slots !== this.config.slots ||
      previous.concurrency !== this.config.concurrency ||
      previous.abortGraceMs !== this.config.abortGraceMs;
    if (hostChanged || this.config.mode === 'main') await this.stopHost();
    return this.config;
  }

  public async stopHost(): Promise<void> {
    const host = this.host;
    this.host = undefined;
    await host?.stop();
  }

  public stats(): Obj {
    return {
      config: this.config,
      outcomes: Object.fromEntries(this.outcomes),
      edges: Object.fromEntries(this.edges),
      runs: this.runs.slice(-5000),
    };
  }

  public resetStats(): void {
    this.edges.clear();
    this.outcomes.clear();
    this.runs.length = 0;
  }

  /** Dispatches a control phase (stats/gc) to warm slots; used by memory probes. */
  public async probe(kind: 'stats' | 'gc' | 'boot' | 'coldstart'): Promise<Obj> {
    if (kind === 'coldstart') {
      await this.stopHost();
      const t0 = performance.now();
      const result = await this.probe('boot');
      return { ...result, coldStartMs: performance.now() - t0, transport: this.config.transport };
    }
    const outcome: Outcome = await this.getHost().run(
      this.runOptions(
        'alerting:.es-query',
        kind === 'boot'
          ? { phase: 'boot', taskType: 'boot', taskInstance: {} }
          : { phase: 'stats', taskType: kind, taskInstance: {} },
        'default',
        undefined
      )
    );
    return outcome.status === 'failure'
      ? { status: 'failure', error: `${outcome.error.name}: ${outcome.error.message}` }
      : (outcome as unknown as Obj);
  }

  private getHost(): ExecutionHost {
    if (!this.host) {
      this.host = new ExecutionHost(this.registry, {
        transport: this.config.transport,
        slotsPerClass: this.config.slots,
        concurrencyPerClass: { [WORKLOAD_CLASS]: this.config.concurrency },
        maxQueuePerClass: 1000,
        abortGraceMs: this.config.abortGraceMs,
        onCrossing: (crossing) => this.recordCrossing(crossing),
      });
    }
    return this.host;
  }

  private recordCrossing(crossing: Crossing): void {
    const agg = this.edges.get(crossing.edge) ?? {
      calls: 0,
      bytesIn: 0,
      bytesOut: 0,
      handlerMs: 0,
      lever: crossing.lever,
      generic: crossing.generic,
    };
    if (crossing.direction === 'isolate_to_host') {
      agg.calls++;
      agg.bytesIn += crossing.bytes;
    } else {
      agg.bytesOut += crossing.bytes;
      agg.handlerMs += crossing.durationMs;
    }
    this.edges.set(crossing.edge, agg);
  }

  private buildSnapshot(): IslandSnapshot {
    if (this.snapshot) return this.snapshot;
    const { core, security } = this.deps;
    const fake = kibanaRequestFactory({ headers: {} });
    const authz = security?.authz as { mode?: { useRbacForRequest: (r: KibanaRequest) => boolean } } | undefined;
    this.snapshot = {
      kibanaVersion: this.env.packageInfo.version,
      buildFlavor: this.env.packageInfo.buildFlavor,
      buildNum: this.env.packageInfo.buildNum,
      buildSha: this.env.packageInfo.buildSha,
      instanceUuid: this.env.instanceUuid,
      dist: this.env.packageInfo.dist,
      dev: this.env.mode.dev,
      basePath: {
        serverBasePath: core.http.basePath.serverBasePath,
        publicBaseUrl: core.http.basePath.publicBaseUrl,
      },
      license: this.license ?? {},
      allIndices: core.savedObjects.getAllIndices(),
      defaultIndex: core.savedObjects.getDefaultIndex(),
      locatorIds: ['DISCOVER_APP_LOCATOR'],
      uiamEnabled: Boolean(core.security.authc.apiKeys.uiam),
      securityEnabled: Boolean(security),
      useRbacForFakeRequest: authz?.mode?.useRbacForRequest(fake) ?? false,
      taskManagerIndex: '.kibana_task_manager',
      rawConfig: {},
    };
    return this.snapshot;
  }

  private capabilities(): Record<string, Binding> {
    const { core, taskManager, encryptedSavedObjects, spaces, security, maintenanceWindows } =
      this.deps;
    const soClient = (args: Obj): Obj => {
      const target = args.target as string;
      let client: Obj;
      if (target === 'internal') {
        client = core.savedObjects.createInternalRepository(args.types as string[]) as unknown as Obj;
      } else if (target === 'unsafeInternal') {
        client = core.savedObjects.getUnsafeInternalClient(args.options as never) as unknown as Obj;
      } else if (target === 'scoped') {
        client = core.savedObjects.getScopedClient(
          decodeFakeRequest(args.request as FakeRequestDescriptor),
          args.options as never
        ) as unknown as Obj;
      } else throw new Error('t7a so: bad target');
      if (typeof args.namespace === 'string')
        client = (client.asScopedToNamespace as AnyFn)(args.namespace) as Obj;
      return client;
    };
    const callArgs = (args: Obj) => (args.args as unknown[] | undefined) ?? [];
    return {
      so: asBinding(async (op, args) => {
        const client = soClient(args);
        const method = client[op] as AnyFn | undefined;
        if (typeof method !== 'function') throw new Error(`t7a so: method ${op} not available`);
        return method.apply(client, callArgs(args));
      }),
      eso: asBinding(async (op, args) => {
        if (op !== 'getDecryptedAsInternalUser') throw new Error('t7a eso: op not allowlisted');
        const client = encryptedSavedObjects!.getClient(args.options as Obj);
        return (client.getDecryptedAsInternalUser as AnyFn)(args.type, args.id, args.opts);
      }),
      tm: asBinding(async (op, args) => {
        if (!['bulkSchedule', 'schedule', 'aggregate', 'fetch', 'get'].includes(op))
          throw new Error('t7a tm: op not allowlisted');
        const list = args as unknown as unknown[];
        return (taskManager[op] as AnyFn).apply(taskManager, list);
      }),
      uiSettings: asBinding(async (op, args) => {
        const client = core.uiSettings.asScopedToClient(soClient(args) as never) as unknown as Obj;
        return (client[op] as AnyFn).apply(client, callArgs(args));
      }),
      spaces: asBinding(async (op, args) => {
        const request = decodeFakeRequest(args.request as FakeRequestDescriptor);
        const service = spaces!.spacesService as Obj;
        if (op === 'getActiveSpace') return (service.getActiveSpace as AnyFn)(request);
        if (op === 'get')
          return ((service.createSpacesClient as AnyFn)(request) as Obj & { get: AnyFn }).get(
            args.id
          );
        throw new Error('t7a spaces: op not allowlisted');
      }),
      security: asBinding(async (op, args) => {
        const request = decodeFakeRequest(args.request as FakeRequestDescriptor);
        const authz = security!.authz as Obj;
        if (op === 'checkPrivilegesDynamically')
          return ((authz.checkPrivilegesDynamicallyWithRequest as AnyFn)(request) as AnyFn)(
            args.privileges,
            args.opts
          );
        const scoped = (authz.checkPrivilegesWithRequest as AnyFn)(request) as Record<string, AnyFn>;
        if (op === 'checkPrivilegesAtSpace')
          return scoped.atSpace(args.spaceId, args.privileges, args.opts);
        if (op === 'checkPrivilegesAtSpaces')
          return scoped.atSpaces(args.spaceIds, args.privileges, args.opts);
        if (op === 'checkPrivilegesGlobally') return scoped.globally(args.privileges, args.opts);
        throw new Error('t7a security: op not allowlisted');
      }),
      mw: asBinding(async (op, args) => {
        const client = maintenanceWindows!.getMaintenanceWindowClientWithoutAuth(
          decodeFakeRequest(args.request as FakeRequestDescriptor)
        );
        return (client[op] as AnyFn).apply(client, callArgs(args));
      }),
    };
  }

  private runOptions(taskType: string, input: Obj, space: string, signal: AbortSignal | undefined) {
    const fake = kibanaRequestFactory({ headers: {} });
    return {
      workloadClass: WORKLOAD_CLASS,
      moduleId: taskType,
      input: input as CodecInput,
      principal: `task:${taskType}`,
      space,
      capabilities: this.capabilities(),
      data: {
        snapshot: this.buildSnapshot(),
        elasticsearch: (this.esCapability ??= captureResearchEsCapability(
          this.deps.core.elasticsearch.client as never,
          fake,
          'internal'
        ) as unknown as Obj),
      } as unknown as CodecInput,
      deadlineMs: this.config.deadlineMs,
      signal,
    };
  }

  private createStub(taskType: string, context: RunContext) {
    const { taskInstance } = context;
    const space = String((taskInstance.params as Obj | undefined)?.spaceId ?? 'default');
    const baseInput = {
      taskType,
      taskInstance: taskInstance as unknown as Obj,
      executionUuid: context.executionUuid,
      ...(context.fakeRequest ? { fakeRequest: encodeFakeRequest(context.fakeRequest) } : {}),
    };
    const dispatch = async (phase: 'run' | 'cleanup') => {
      const t0 = performance.now();
      const outcome = await this.getHost().run(
        this.runOptions(taskType, { ...baseInput, phase }, space, context.signal)
      );
      const key = `${taskType}/${phase}/${outcome.status}`;
      this.outcomes.set(key, (this.outcomes.get(key) ?? 0) + 1);
      const value = (outcome.status === 'success' ? outcome.value : undefined) as Obj | undefined;
      this.runs.push({
        taskType,
        phase,
        status: outcome.status,
        dispatchMs: performance.now() - t0,
        runMs: value?.runMs,
        coldBootMs: value?.coldBootMs,
        heapUsed: outcome.status === 'success' ? outcome.heapUsed : undefined,
        rss: outcome.status === 'success' ? outcome.rss : undefined,
        at: Date.now(),
        ...(outcome.status === 'terminated' ? { reason: outcome.reason } : {}),
      });
      if (outcome.status === 'failure') throw outcome.error;
      if (outcome.status === 'terminated') {
        throw new Error(`t7a: ${taskType} ${phase} terminated in isolate (${outcome.reason})`);
      }
      const customFields = value?.customFields as Obj | undefined;
      if (customFields && Object.keys(customFields).length)
        context.setCustomTaskRunEventFields?.(customFields as never);
      if (value?.thrown) throw decodeTaskError(value.thrown as WireTaskError);
      return value;
    };
    return {
      run: async () => {
        const value = await dispatch('run');
        return decodeRunResult((value?.wire ?? {}) as WireRunResult) as never;
      },
      // TM's cancel wrapper aborts context.signal → kit cooperative cancel → isolate runner.cancel().
      cancel: async () => undefined,
      ...(taskType.startsWith('actions:')
        ? {
            cleanup: async () => {
              await dispatch('cleanup');
            },
          }
        : {}),
    };
  }
}
