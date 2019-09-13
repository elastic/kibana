/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'src/core/public';
import { npSetup, npStart } from 'ui/new_platform';
import chrome, { Chrome } from 'ui/chrome';
import { Plugin as EmbeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start as embeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
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
}

export interface EditorFrameStartPlugins {
  data: typeof dataStart;
  embeddables: ReturnType<EmbeddablePlugin['start']>;
  chrome: Chrome;
}

export class EditorFramePlugin {
  constructor() {}

  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  public setup(core: CoreSetup, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    plugins.data.expressions.registerFunction(() => mergeTables);

    return {
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: visualization => {
        this.visualizations[visualization.id] = visualization as Visualization<unknown, unknown>;
      },
    };
  }

  public start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart {
    plugins.embeddables.registerEmbeddableFactory(
      'lens',
      new EmbeddableFactory(
        plugins.chrome,
        plugins.data.expressions.ExpressionRenderer,
        plugins.data.indexPatterns.indexPatterns
      )
    );

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
                core={core}
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
  editorFrame.setup(npSetup.core, {
    data: dataSetup,
  });

export const editorFrameStart = () =>
  editorFrame.start(npStart.core, {
    data: dataStart,
    chrome,
    embeddables: embeddablePlugin,
  });

export const editorFrameStop = () => editorFrame.stop();
