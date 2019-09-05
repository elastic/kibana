/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'src/core/public';
import chrome, { Chrome } from 'ui/chrome';
import { Plugin as EmbeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { setup as embeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  setup as dataSetup,
  start as dataStart,
} from '../../../../../../src/legacy/core_plugins/data/public/legacy';
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
  data: typeof dataSetup;
  chrome: Chrome;
  embeddables: ReturnType<EmbeddablePlugin['setup']>;
}

export interface EditorFrameStartPlugins {
  data: typeof dataStart;
}

export class EditorFramePlugin {
  constructor() {}

  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  private embeddableFactory: EmbeddableFactory | null = null;

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    plugins.data.expressions.registerFunction(() => mergeTables);

    this.embeddableFactory = new EmbeddableFactory(
      plugins.chrome,
      plugins.data.indexPatterns.indexPatterns
    );

    plugins.embeddables.registerEmbeddableFactory('lens', this.embeddableFactory);

    return {
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: visualization => {
        this.visualizations[visualization.id] = visualization as Visualization<unknown, unknown>;
      },
    };
  }

  public start(_core: CoreStart | null, plugins: EditorFrameStartPlugins): EditorFrameStart {
    if (this.embeddableFactory === null) {
      throw new Error('Start lifecycle called before setup lifecycle');
    }

    this.embeddableFactory.setExpressionRenderer(plugins.data.expressions.ExpressionRenderer);

    const createInstance = (): EditorFrameInstance => {
      let domElement: Element;
      return {
        mount: (element, { doc, onError, dateRange, query, onChange }) => {
          domElement = element;
          const firstDatasourceId = Object.keys(this.datasources)[0];
          const firstVisualizationId = Object.keys(this.visualizations)[0];

          render(
            <I18nProvider>
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                onError={onError}
                datasourceMap={this.datasources}
                visualizationMap={this.visualizations}
                initialDatasourceId={getActiveDatasourceIdFromDoc(doc) || firstDatasourceId || null}
                initialVisualizationId={
                  (doc && doc.visualizationType) || firstVisualizationId || null
                }
                ExpressionRenderer={plugins.data.expressions.ExpressionRenderer}
                doc={doc}
                dateRange={dateRange}
                query={query}
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

  public stop() {
    return {};
  }
}

const editorFrame = new EditorFramePlugin();

export const editorFrameSetup = () =>
  editorFrame.setup(null, {
    data: dataSetup,
    chrome,
    embeddables: embeddablePlugin,
  });

export const editorFrameStart = () =>
  editorFrame.start(null, {
    data: dataStart,
  });

export const editorFrameStop = () => editorFrame.stop();
