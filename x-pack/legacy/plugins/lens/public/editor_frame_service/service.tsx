/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'src/core/public';
import {
  ExpressionsSetup,
  ExpressionsStart,
} from '../../../../../../src/plugins/expressions/public';
import {
  IEmbeddableSetup,
  IEmbeddableStart,
} from '../../../../../../src/plugins/embeddable/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../../src/plugins/data/public';
import {
  Datasource,
  Visualization,
  EditorFrameSetup,
  EditorFrameInstance,
  EditorFrameStart,
} from '../types';
import { EditorFrame } from './editor_frame';
import { mergeTables } from './merge_tables';
import { EmbeddableFactory } from './embeddable/embeddable_factory';
import { getActiveDatasourceIdFromDoc } from './editor_frame/state_management';

export interface EditorFrameSetupPlugins {
  data: DataPublicPluginSetup;
  embeddable: IEmbeddableSetup;
  expressions: ExpressionsSetup;
}

export interface EditorFrameStartPlugins {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  expressions: ExpressionsStart;
}

async function collectAsyncDefinitions<T extends { id: string }>(
  definitions: Array<T | Promise<T>>
) {
  const resolvedDefinitions = await Promise.all(definitions);
  const definitionMap: Record<string, T> = {};
  resolvedDefinitions.forEach(definition => {
    definitionMap[definition.id] = definition;
  });

  return definitionMap;
}

export class EditorFrameService {
  constructor() {}

  private readonly datasources: Array<Datasource | Promise<Datasource>> = [];
  private readonly visualizations: Array<Visualization | Promise<Visualization>> = [];

  public setup(core: CoreSetup, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    plugins.expressions.registerFunction(() => mergeTables);

    return {
      registerDatasource: datasource => {
        this.datasources.push(datasource as Datasource<unknown, unknown>);
      },
      registerVisualization: visualization => {
        this.visualizations.push(visualization as Visualization<unknown, unknown>);
      },
    };
  }

  public start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart {
    plugins.embeddable.registerEmbeddableFactory(
      'lens',
      new EmbeddableFactory(
        plugins.data.query.timefilter.timefilter,
        core.http,
        core.application.capabilities,
        core.savedObjects.client,
        plugins.expressions.ReactExpressionRenderer,
        plugins.data.indexPatterns
      )
    );

    const createInstance = async (): Promise<EditorFrameInstance> => {
      let domElement: Element;
      const [resolvedDatasources, resolvedVisualizations] = await Promise.all([
        collectAsyncDefinitions(this.datasources),
        collectAsyncDefinitions(this.visualizations),
      ]);

      return {
        mount: (element, { doc, onError, dateRange, query, filters, savedQuery, onChange }) => {
          domElement = element;
          const firstDatasourceId = Object.keys(resolvedDatasources)[0];
          const firstVisualizationId = Object.keys(resolvedVisualizations)[0];

          render(
            <I18nProvider>
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                onError={onError}
                datasourceMap={resolvedDatasources}
                visualizationMap={resolvedVisualizations}
                initialDatasourceId={getActiveDatasourceIdFromDoc(doc) || firstDatasourceId || null}
                initialVisualizationId={
                  (doc && doc.visualizationType) || firstVisualizationId || null
                }
                core={core}
                ExpressionRenderer={plugins.expressions.ReactExpressionRenderer}
                doc={doc}
                dateRange={dateRange}
                query={query}
                filters={filters}
                savedQuery={savedQuery}
                onChange={onChange}
              />
            </I18nProvider>,
            domElement
          );
        },
        unmount() {
          if (domElement) {
            unmountComponentAtNode(domElement);
          }
        },
      };
    };

    return {
      createInstance,
    };
  }
}
