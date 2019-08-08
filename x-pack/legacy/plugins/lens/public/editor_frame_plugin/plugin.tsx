/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import chrome, { Chrome } from 'ui/chrome';
import {
  EmbeddablePlugin,
  embeddablePlugin,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ExpressionRenderer } from '../../../../../../src/legacy/core_plugins/data/public';
import { setup as data } from '../../../../../../src/legacy/core_plugins/data/public/legacy';
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { Datasource, Visualization, EditorFrameSetup, EditorFrameInstance } from '../types';
import { EditorFrame } from './editor_frame';
import { mergeTables } from './merge_tables';
import { EmbeddableFactory } from './embeddable/embeddable_factory';

export interface EditorFrameSetupPlugins {
  data: typeof data;
  chrome: Chrome;
  embeddables: EmbeddablePlugin;
  interpreter: InterpreterSetup;
}

export interface InterpreterSetup {
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

export class EditorFramePlugin {
  constructor() {}

  private ExpressionRenderer: ExpressionRenderer | null = null;
  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  private createInstance(): EditorFrameInstance {
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
              initialDatasourceId={(doc && doc.activeDatasourceId) || firstDatasourceId || null}
              initialVisualizationId={
                (doc && doc.visualizationType) || firstVisualizationId || null
              }
              ExpressionRenderer={this.ExpressionRenderer!}
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
  }

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    plugins.interpreter.functionsRegistry.register(() => mergeTables);

    this.ExpressionRenderer = plugins.data.expressions.ExpressionRenderer;
    plugins.embeddables.addEmbeddableFactory(
      new EmbeddableFactory(
        plugins.chrome,
        this.ExpressionRenderer,
        plugins.data.indexPatterns.indexPatterns
      )
    );

    return {
      createInstance: this.createInstance.bind(this),
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: visualization => {
        this.visualizations[visualization.id] = visualization as Visualization<unknown, unknown>;
      },
    };
  }

  public stop() {
    return {};
  }
}

const editorFrame = new EditorFramePlugin();

export const editorFrameSetup = () =>
  editorFrame.setup(null, {
    data,
    chrome,
    embeddables: embeddablePlugin,
    interpreter: {
      functionsRegistry,
    },
  });

export const editorFrameStop = () => editorFrame.stop();
