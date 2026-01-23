/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EmbeddableRegistryDefinition, EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { setupSavedObjects } from './saved_objects';
import { setupExpressions } from './expressions';
import { makeLensEmbeddableFactory } from './embeddable/make_lens_embeddable_factory';
import type { CustomVisualizationMigrations } from './migrations/types';
import { LensAppLocatorDefinition } from '../common/locator/locator';
import {
  LENS_CONTENT_TYPE,
  LENS_EMBEDDABLE_TYPE,
  LENS_ITEM_LATEST_VERSION,
} from '../common/constants';
import { LensStorage } from './content_management';
import { registerLensAPIRoutes } from './api/routes';
import { fetchLensFeatureFlags } from '../common';
import { getLensServerTransforms } from './transforms';

export interface PluginSetupContract {
  taskManager?: TaskManagerSetupContract;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsServerSetup;
  data: DataPluginSetup;
  share?: SharePluginSetup;
  contentManagement: ContentManagementServerSetup;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
  fieldFormats: FieldFormatsStart;
  data: DataPluginStart;
  dataViews: DataViewsServerPluginStart;
}

export interface LensServerPluginSetup {
  /**
   * Server side embeddable definition which provides migrations to run if Lens state is embedded into another saved object somewhere
   */
  lensEmbeddableFactory: ReturnType<typeof makeLensEmbeddableFactory>;
  /**
   * Register custom migration functions for custom third party Lens visualizations
   */
  registerVisualizationMigration: (
    id: string,
    migrationsGetter: () => MigrateFunctionsObject
  ) => void;
}

export class LensServerPlugin
  implements Plugin<LensServerPluginSetup, {}, PluginSetupContract, PluginStartContract>
{
  private customVisualizationMigrations: CustomVisualizationMigrations = {};
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );
    setupSavedObjects(core, getFilterMigrations, this.customVisualizationMigrations);
    setupExpressions(core, plugins.expressions);

    if (plugins.share) {
      plugins.share.url.locators.create(new LensAppLocatorDefinition());
    }

    plugins.contentManagement.register({
      id: LENS_CONTENT_TYPE,
      storage: new LensStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.initializerContext.logger.get('storage'),
      }),
      version: {
        latest: LENS_ITEM_LATEST_VERSION,
      },
    });

    const lensEmbeddableFactory = makeLensEmbeddableFactory(
      getFilterMigrations,
      DataViewPersistableStateService.getAllMigrations.bind(DataViewPersistableStateService),
      this.customVisualizationMigrations
    );

    plugins.embeddable.registerEmbeddableFactory(
      lensEmbeddableFactory() as unknown as EmbeddableRegistryDefinition
    );
    const builder = new LensConfigBuilder();

    registerLensAPIRoutes({
      http: core.http,
      contentManagement: plugins.contentManagement,
      builder,
      logger: this.logger,
    });

    core
      .getStartServices()
      .then(async ([{ featureFlags }]) => {
        const flags = await fetchLensFeatureFlags(featureFlags);
        builder.setEnabled(flags.apiFormat);

        // Need to wait for feature flags to be set before registering transforms
        plugins.embeddable.registerTransforms(
          LENS_EMBEDDABLE_TYPE,
          getLensServerTransforms(builder, plugins.embeddable)
        );

        flags.apiFormat$.subscribe((value) => {
          builder.setEnabled(value);
        });
      })
      .catch((error) => {
        this.logger.error(error);
      });

    return {
      lensEmbeddableFactory,
      registerVisualizationMigration: (
        id: string,
        migrationsGetter: () => MigrateFunctionsObject
      ) => {
        if (this.customVisualizationMigrations[id]) {
          throw new Error(`Migrations object for visualization ${id} registered already`);
        }
        this.customVisualizationMigrations[id] = migrationsGetter;
      },
    };
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    return {};
  }

  stop() {}
}
