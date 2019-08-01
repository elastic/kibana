/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Registry } from '@kbn/interpreter/target/common';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup } from 'src/core/public';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import chrome, { Chrome } from 'ui/chrome';
import {
  EmbeddablePlugin,
  embeddablePlugin,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public';
import {
  DataSetup,
  ExpressionRenderer,
} from '../../../../../../src/legacy/core_plugins/data/public';
import { data } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import {
  Datasource,
  Visualization,
  EditorFrameSetup,
  EditorFrameInstance,
  ErrorCallback,
} from '../types';
import { EditorFrame } from './editor_frame';
import { SavedObjectIndexStore, SavedObjectStore, Document } from '../persistence';
import { InitializableComponent } from './initializable_component';
import { mergeTables } from './merge_tables';
import { EmbeddableFactory } from './embeddable/embeddable_factory';

export interface EditorFrameSetupPlugins {
  data: DataSetup;
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

interface InitializationResult {
  doc?: Document;
  error?: { message: string };
}

interface InitializationProps {
  persistedId?: string;
  store: SavedObjectStore;
  onError: ErrorCallback;
}

interface RenderProps extends InitializationResult {
  routeProps: { history: { push: (path: string) => void } };
  store: SavedObjectStore;
  onError: ErrorCallback;
  datasources: Record<string, Datasource>;
  visualizations: Record<string, Visualization>;
  expressionRenderer: ExpressionRenderer;
}

export class EditorFramePlugin {
  constructor() {}

  private ExpressionRenderer: ExpressionRenderer | null = null;
  private chrome: Chrome | null = null;
  private readonly datasources: Record<string, Datasource> = {};
  private readonly visualizations: Record<string, Visualization> = {};

  private createInstance(): EditorFrameInstance {
    let domElement: Element;

    const store = new SavedObjectIndexStore(this.chrome!.getSavedObjectsClient());

    function unmount() {
      if (domElement) {
        unmountComponentAtNode(domElement);
      }
    }

    return {
      mount: (element, { onError }) => {
        domElement = element;

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          const persistedId = routeProps.match.params.id;

          return (
            <InitializableComponent
              watch={[persistedId]}
              init={async () => init({ persistedId, store, onError })}
              render={({ doc, error }) => (
                <InitializedEditor
                  doc={doc}
                  error={error}
                  routeProps={routeProps}
                  onError={onError}
                  store={store}
                  datasources={this.datasources}
                  visualizations={this.visualizations}
                  expressionRenderer={this.ExpressionRenderer!}
                />
              )}
            />
          );
        };

        render(
          <I18nProvider>
            <HashRouter>
              <Switch>
                <Route exact path="/edit/:id" render={renderEditor} />
                <Route exact path="/" render={renderEditor} />
                <Route component={NotFound} />
              </Switch>
            </HashRouter>
          </I18nProvider>,
          domElement
        );
      },
      unmount,
    };
  }

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins): EditorFrameSetup {
    plugins.interpreter.functionsRegistry.register(() => mergeTables);

    this.ExpressionRenderer = plugins.data.expressions.ExpressionRenderer;
    this.chrome = plugins.chrome;
    plugins.embeddables.addEmbeddableFactory(
      new EmbeddableFactory(plugins.chrome, this.ExpressionRenderer, plugins.data.indexPatterns)
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

function NotFound() {
  return <h1>TODO: 404 Page</h1>;
}

function is404(error?: unknown) {
  return error && (error as { statusCode: number }).statusCode === 404;
}

export async function init({
  persistedId,
  store,
  onError,
}: InitializationProps): Promise<InitializationResult> {
  if (!persistedId) {
    return {};
  } else {
    return store
      .load(persistedId)
      .then(doc => ({ doc }))
      .catch((error: Error) => {
        if (!is404(error)) {
          onError(error);
        }
        return { error };
      });
  }
}

export function InitializedEditor({
  doc,
  error,
  routeProps,
  onError,
  store,
  datasources,
  visualizations,
  expressionRenderer,
}: RenderProps) {
  const firstDatasourceId = Object.keys(datasources)[0];
  const firstVisualizationId = Object.keys(visualizations)[0];

  if (is404(error)) {
    return <NotFound />;
  }

  return (
    <EditorFrame
      data-test-subj="lnsEditorFrame"
      onError={onError}
      store={store}
      datasourceMap={datasources}
      visualizationMap={visualizations}
      initialDatasourceId={(doc && doc.activeDatasourceId) || firstDatasourceId || null}
      initialVisualizationId={(doc && doc.visualizationType) || firstVisualizationId || null}
      ExpressionRenderer={expressionRenderer}
      redirectTo={path => routeProps.history.push(path)}
      doc={doc}
    />
  );
}
