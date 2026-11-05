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
import type { KibanaIsomerRuntime } from '@kbn/isomer';
import { firstValueFrom } from 'rxjs';
import { MATERIALIZE_FEATURE_FLAG } from '../common/constants';
import { createScopedMaterializeClient } from './materialize/materialize_client';
import { MaterializerRegistry } from './materialize/registry';
import type { MaterializeScope, Materializer, ScopedMaterializeClient } from './materialize/types';
import { abortSignalFor } from './materialize/abort_signal';
import { registerMaterializeRoute } from './routes/materialize_route';

/** Setup contract for registering materializers before the plugin starts. */
export interface IsomerPluginSetup {
  /**
   * Registers a materializer for one saved object type. Each type can be registered only once.
   *
   * @param type Saved object type handled by the materializer.
   * @param materializer Parser, planner, and mapper for that type's as-code config.
   */
  registerMaterializer: <TConfig>(type: string, materializer: Materializer<TConfig>) => void;
}

/** Options for creating a request-scoped materialization client. */
export interface AsScopedOptions {
  /** Cancels materializer work. Defaults to the abort signal for the request. */
  abortSignal?: AbortSignal;
}

/** Start contract for the Isomer runtime and user-scoped materialization. */
export interface IsomerPluginStart {
  /** Loads the shared runtime and primitive packs on first use. */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
  /** Resolves whether materialization is enabled by the current feature-flag evaluation. */
  isMaterializeEnabled: () => Promise<boolean>;
  /**
   * Creates a client that loads saved objects and materializes them as the user who made `request`.
   *
   * @param request Authenticated Kibana request that scopes saved-object access.
   * @param options Optional abort signal for work started by the client.
   */
  asScoped: (request: KibanaRequest, options?: AsScopedOptions) => ScopedMaterializeClient;
}

const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [{ createKibanaIsomerRuntime }, { componentsPack }] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
  ]);
  return createKibanaIsomerRuntime({ packs: [componentsPack] });
};

/** Registers the materialization API and exposes the shared Isomer runtime. */
export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly logger: Logger;
  private readonly registry = new MaterializerRegistry();
  private runtime?: Promise<KibanaIsomerRuntime>;
  private featureFlags?: CoreStart['featureFlags'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(core: CoreSetup): IsomerPluginSetup {
    registerMaterializeRoute({
      router: core.http.createRouter(),
      createClient: this.createClient,
    });
    return {
      registerMaterializer: (type, materializer) => this.registry.register(type, materializer),
    };
  }

  start(core: CoreStart): IsomerPluginStart {
    this.featureFlags = core.featureFlags;
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

  private readonly isMaterializeEnabled = async (): Promise<boolean> => {
    if (!this.featureFlags) {
      return false;
    }
    // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- evaluated per materialization action
    return firstValueFrom(this.featureFlags.getBooleanValue$(MATERIALIZE_FEATURE_FLAG, false));
  };

  private readonly createClient = (scope: MaterializeScope): ScopedMaterializeClient =>
    createScopedMaterializeClient({
      registry: this.registry,
      scope,
      isEnabled: this.isMaterializeEnabled,
      validateNode: async (node) => {
        const { errors } = (await this.getRuntime()).validate({ type: 'view', body: [node] });
        if (errors.length > 0) {
          throw new Error(errors.map(({ path, message }) => `${path}: ${message}`).join('\n'));
        }
      },
      logger: this.logger.get('materialize'),
    });

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components pack.');
        return runtime;
      },
      (error) => {
        this.runtime = undefined;
        throw error;
      }
    );
    return this.runtime;
  };
}
