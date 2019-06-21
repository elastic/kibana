/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup } from 'src/core/public';
import {
  DataSetup,
  ExpressionRenderer,
} from '../../../../../../src/legacy/core_plugins/data/public';
import { data } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { Datasource, Visualization, EditorFrameSetup, EditorFrameInstance } from '../types';
import { EditorFrame } from './editor_frame';

export interface EditorFrameSetupPlugins {
  data: DataSetup;
}

export class EditorFramePlugin {
  constructor() {}
  private ExpressionRenderer: ExpressionRenderer | null = null;

  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  private createInstance(): EditorFrameInstance {
    let domElement: Element;

    function unmount() {
      if (domElement) {
        unmountComponentAtNode(domElement);
      }
    }

    return {
      mount: element => {
        unmount();
        domElement = element;

        const firstDatasourceId = Object.keys(this.datasources)[0];
        const firstVisualizationId = Object.keys(this.visualizations)[0];

        render(
          <I18nProvider>
            <EditorFrame
              datasourceMap={this.datasources}
              visualizationMap={this.visualizations}
              initialDatasourceId={firstDatasourceId || null}
              initialVisualizationId={firstVisualizationId || null}
              ExpressionRenderer={this.ExpressionRenderer!}
            />
          </I18nProvider>,
          domElement
        );
      },
      unmount,
    };
  }

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    this.ExpressionRenderer = plugins.data.expressions.ExpressionRenderer;
    return {
      createInstance: this.createInstance.bind(this),
      registerDatasource: (name, datasource) => {
        this.datasources[name] = datasource as Datasource<unknown, unknown>;
      },
      registerVisualization: (name, visualization) => {
        this.visualizations[name] = visualization as Visualization<unknown, unknown>;
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
  });
export const editorFrameStop = () => editorFrame.stop();
