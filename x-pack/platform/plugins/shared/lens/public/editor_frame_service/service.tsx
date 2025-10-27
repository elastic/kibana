/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { css } from '@emotion/react';
import type {
  LensDocument,
  Datasource,
  Visualization,
  EditorFrameSetup,
  EditorFrameInstance,
  EditorFrameStart,
} from '@kbn/lens-common';

export interface EditorFrameSetupPlugins {
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
  usageCollection?: UsageCollectionSetup;
  dataViews: DataViewsPublicPluginSetup;
}

export interface EditorFrameStartPlugins {
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  embeddable?: EmbeddableStart;
  expressions: ExpressionsStart;
  charts: ChartsPluginSetup;
  dataViews: DataViewsPublicPluginStart;
  eventAnnotationService: EventAnnotationServiceType;
}

export interface EditorFramePlugins {
  dataViews: DataViewsContract;
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  timefilter: TimefilterContract;
  nowProvider: DataPublicPluginStart['nowProvider'];
  eventAnnotationService: EventAnnotationServiceType;
}

async function collectAsyncDefinitions<T extends { id: string; alias?: string[] }>(
  definitions: Array<T | (() => Promise<T>)>
) {
  const resolvedDefinitions = await Promise.all(
    definitions.map((definition) => (typeof definition === 'function' ? definition() : definition))
  );
  const definitionMap: Record<string, T> = {};
  resolvedDefinitions.forEach((definition) => {
    definitionMap[definition.id] = definition;
    if (definition.alias) {
      for (const aliasId of definition.alias) {
        definitionMap[aliasId] = definition;
      }
    }
  });

  return definitionMap;
}

export class EditorFrameService {
  private readonly datasources: Array<Datasource | (() => Promise<Datasource>)> = [];
  private readonly visualizations: Array<Visualization | (() => Promise<Visualization>)> = [];

  public loadDatasources = () => collectAsyncDefinitions(this.datasources);
  public loadVisualizations = () => collectAsyncDefinitions(this.visualizations);

  /**
   * This method takes a Lens saved object as returned from the persistence helper,
   * initializes datsources and visualization and creates the current expression.
   * This is an asynchronous process.
   * @param doc parsed Lens saved object
   */
  public documentToExpression = async (
    doc: LensDocument,
    services: EditorFramePlugins & { forceDSL?: boolean }
  ) => {
    const [resolvedDatasources, resolvedVisualizations, { persistedStateToExpression }] =
      await Promise.all([
        this.loadDatasources(),
        this.loadVisualizations(),
        import('../async_services'),
      ]);

    return persistedStateToExpression(resolvedDatasources, resolvedVisualizations, doc, services);
  };

  public setup(): EditorFrameSetup {
    return {
      registerDatasource: (datasource) => {
        this.datasources.push(datasource as Datasource<unknown, unknown>);
      },
      registerVisualization: (visualization) => {
        this.visualizations.push(visualization as Visualization<unknown>);
      },
    };
  }

  public start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart {
    const createInstance = async (): Promise<EditorFrameInstance> => {
      const [resolvedDatasources, resolvedVisualizations, { EditorFrame }] = await Promise.all([
        this.loadDatasources(),
        this.loadVisualizations(),
        import('../async_services'),
      ]);

      return {
        EditorFrameContainer: ({
          showNoDataPopover,
          lensInspector,
          indexPatternService,
          getUserMessages,
          addUserMessages,
        }) => {
          return (
            <div
              css={css`
                position: relative;
                display: flex;
                flex-direction: column;
                flex-grow: 1;
              `}
            >
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                core={core}
                plugins={plugins}
                lensInspector={lensInspector}
                showNoDataPopover={showNoDataPopover}
                getUserMessages={getUserMessages}
                addUserMessages={addUserMessages}
                indexPatternService={indexPatternService}
                ExpressionRenderer={plugins.expressions.ReactExpressionRenderer}
              />
            </div>
          );
        },
        datasourceMap: resolvedDatasources,
        visualizationMap: resolvedVisualizations,
      };
    };

    return {
      createInstance,
    };
  }
}
