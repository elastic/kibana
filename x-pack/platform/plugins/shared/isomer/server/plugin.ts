/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { KibanaIsomerRuntime } from '@kbn/isomer';
import type { Subscription } from 'rxjs';
import { MATERIALIZE_FEATURE_FLAG } from '../common';
import type { MaterializeEvent, RenderEvent } from './instrumentation/events';
import { MATERIALIZE_EVENT, RENDER_EVENT } from './instrumentation/events';
import { instrumentRuntime } from './instrumentation/instrument_runtime';
import { createScopedMaterializeClient } from './materialize/materialize_client';
import { MaterializerRegistry } from './materialize/registry';
import { createNodeValidator } from './materialize/validate_node';
import type { MaterializeScope, Materializer, ScopedMaterializeClient } from './materialize/types';
import { abortSignalFor } from './materialize/abort_signal';
import { registerMaterializeRoute } from './routes/materialize_route';

export interface IsomerPluginSetup {
  /** Registers the materializer for one saved object type. Each type has at most one. */
  registerMaterializer: <TConfig>(type: string, materializer: Materializer<TConfig>) => void;
}

export interface AsScopedOptions {
  /** Cancels the user's queries. Defaults to the request's own abort. */
  abortSignal?: AbortSignal;
}

export interface IsomerPluginStartDependencies {
  data: DataPluginStart;
}

export interface IsomerPluginStart {
  /** Loads the shared runtime and primitive packs on first use. */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
  /** Whether materialization is turned on. */
  isMaterializeEnabled: () => Promise<boolean>;
  /** Materialization as the user who made `request`. */
  asScoped: (request: KibanaRequest, options?: AsScopedOptions) => ScopedMaterializeClient;
}

const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [{ createKibanaIsomerRuntime }, { componentsPack }] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
  ]);
  return createKibanaIsomerRuntime({ packs: [componentsPack] });
};

export class IsomerPlugin
  implements Plugin<IsomerPluginSetup, IsomerPluginStart, object, IsomerPluginStartDependencies>
{
  private readonly logger: Logger;
  private readonly kibanaVersion: string;
  private data?: DataPluginStart;
  private reportEvent?: CoreStart['analytics']['reportEvent'];
  private readonly registry = new MaterializerRegistry();
  private runtime?: Promise<KibanaIsomerRuntime>;
  private materializeEnabled = false;
  private materializeEnabledSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  setup(core: CoreSetup): IsomerPluginSetup {
    core.analytics.registerEventType(MATERIALIZE_EVENT);
    core.analytics.registerEventType(RENDER_EVENT);
    registerMaterializeRoute({
      router: core.http.createRouter(),
      createClient: this.createClient,
    });
    return {
      registerMaterializer: (type, materializer) => this.registry.register(type, materializer),
    };
  }

  start(core: CoreStart, { data }: IsomerPluginStartDependencies): IsomerPluginStart {
    this.data = data;
    this.reportEvent = core.analytics.reportEvent;
    this.materializeEnabledSubscription = core.featureFlags
      .getBooleanValue$(MATERIALIZE_FEATURE_FLAG, false)
      .subscribe((enabled) => {
        this.materializeEnabled = enabled;
      });
    return {
      getRuntime: this.getRuntime,
      isMaterializeEnabled: this.isMaterializeEnabled,
      asScoped: (request, { abortSignal } = {}) =>
        this.createClient({
          request,
          savedObjectsClient: core.savedObjects.getScopedClient(request),
          abortSignal: abortSignal ?? abortSignalFor(request),
        }),
    };
  }

  stop() {
    this.materializeEnabledSubscription?.unsubscribe();
  }

  private readonly isMaterializeEnabled = async (): Promise<boolean> => this.materializeEnabled;

  private readonly createClient = (scope: MaterializeScope): ScopedMaterializeClient => {
    if (!this.data) {
      throw new Error('The isomer plugin materializes only after it starts.');
    }
    return createScopedMaterializeClient({
      registry: this.registry,
      scope,
      isEnabled: this.isMaterializeEnabled,
      logger: this.logger.get('materialize'),
      search: this.data.search.asScoped(scope.request),
      validate: this.validateNode,
      kibanaVersion: this.kibanaVersion,
      report: this.reportMaterialize,
    });
  };

  private readonly validateNode = createNodeValidator(() => this.getRuntime());

  private readonly reportMaterialize = (event: MaterializeEvent) => {
    this.logger.get('instrumentation').debug(() => `Materialized: ${JSON.stringify(event)}`);
    this.reportEvent?.(MATERIALIZE_EVENT.eventType, event);
  };

  private readonly reportRender = (event: RenderEvent) => {
    this.logger.get('instrumentation').debug(() => `Rendered: ${JSON.stringify(event)}`);
    this.reportEvent?.(RENDER_EVENT.eventType, event);
  };

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components pack.');
        return instrumentRuntime(runtime, this.reportRender);
      },
      (error) => {
        this.runtime = undefined;
        throw error;
      }
    );
    return this.runtime;
  };
}
