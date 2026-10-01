/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  ExploreRequest,
  ExploreResults,
  SearchRequest,
  SearchResults,
  TermIntersect,
  RuntimeGraph,
  WorkspaceNode,
} from '../types';
import {
  createGraphStore,
  createRuntimeGraphState,
  workspaceRuntimeChanged,
  type GraphStore,
} from '../state_management';
import { createRuntimeGraph } from '../services/workspace/runtime_graph';
import { GraphLayoutController } from '../services/workspace/graph_layout_controller';
import { mergeRuntimeGraph as applyRuntimeGraphMerge } from '../services/workspace/runtime_graph_merge';
import { ReduxLayoutTopology } from '../services/workspace/redux_layout_topology';
import {
  buildIntersectionRequest,
  buildNodeQuery,
} from '../services/workspace/graph_request_builders';
import { transformIntersectionResponse } from '../services/workspace/intersections';
import { unpackGroupedNodes } from '../services/workspace/runtime_grouping';
import { WorkspaceLayout } from '../components/workspace_layout';
import type { GraphServices } from '../application';
import { useWorkspaceLoader } from '../helpers/use_workspace_loader';
import { useGraphLoader } from '../helpers/use_graph_loader';
import { createCachedIndexPatternProvider } from '../services/index_pattern_cache';

export interface WorkspaceRouteProps {
  deps: GraphServices;
}

export const WorkspaceRoute = ({
  deps: {
    toastNotifications,
    coreStart,
    contentClient,
    graphSavePolicy,
    canEditDrillDownUrls,
    overlays,
    capabilities,
    storage,
    data,
    kql,
    getBasePath,
    addBasePath,
    spaces,
    dataViews,
    inspect,
    savedObjectsManagement,
    contentManagement,
  },
}: WorkspaceRouteProps) => {
  // D3 continues to own a mutable runtime workspace while serializable graph state lives in Redux.
  const runtimeGraphRef = useRef<RuntimeGraph>();
  const layoutControllerRef = useRef<GraphLayoutController>();
  const storeRef = useRef<GraphStore>();
  const runtimeSequenceRef = useRef(0);
  const history = useHistory();

  const indexPatternProvider = useMemo(
    () => createCachedIndexPatternProvider(dataViews.get),
    [dataViews.get]
  );

  const services = useMemo(
    () => ({
      appName: 'graph',
      storage,
      data,
      kql,
      savedObjectsManagement,
      contentManagement,
      ...coreStart,
    }),
    [coreStart, data, storage, kql, savedObjectsManagement, contentManagement]
  );

  const { loading, requestAdapter, callNodeProxy, callSearchNodeProxy, handleSearchQueryError } =
    useGraphLoader({
      toastNotifications,
      coreStart,
    });

  const exploreGraph = useMemo(
    () => (index: string, request: ExploreRequest) =>
      new Promise<ExploreResults>((resolve, reject) => {
        callNodeProxy(index, request, resolve, reject);
      }),
    [callNodeProxy]
  );

  const searchGraph = useMemo(
    () => (index: string, request: SearchRequest) =>
      new Promise<SearchResults>((resolve, reject) => {
        callSearchNodeProxy(index, request, resolve, reject);
      }),
    [callSearchNodeProxy]
  );

  const getMergeCandidates = async (nodes: WorkspaceNode[]): Promise<TermIntersect[]> => {
    const workspace = runtimeGraphRef.current;
    const datasource = storeRef.current?.getState().datasource.current;
    if (!workspace || !datasource || datasource.type === 'none') return [];
    const indexName = datasource.title;
    const topLevelNodes = nodes.filter((node) => node.parent === undefined);
    const request = buildIntersectionRequest(
      topLevelNodes.map((node) => buildNodeQuery(unpackGroupedNodes([node], workspace.edges)))
    );
    const response = await searchGraph(indexName, request);
    return transformIntersectionResponse(response, topLevelNodes);
  };

  const mergeRuntimeGraph = (
    runtimeGraph: RuntimeGraph,
    graph: Parameters<typeof applyRuntimeGraphMerge>[1]
  ) => {
    runtimeSequenceRef.current = applyRuntimeGraphMerge(
      runtimeGraph,
      graph,
      runtimeSequenceRef.current,
      layoutControllerRef.current!
    );
  };

  const notifyWorkspaceChanged = () => {
    const workspace = runtimeGraphRef.current;
    if (workspace) {
      storeRef.current?.dispatch(
        workspaceRuntimeChanged(
          createRuntimeGraphState(workspace, layoutControllerRef.current?.isRunning())
        )
      );
    }
  };

  const [store] = useState(() =>
    createGraphStore({
      basePath: getBasePath(),
      addBasePath,
      indexPatternProvider,
      createRuntimeGraph: () => {
        layoutControllerRef.current?.stop();
        runtimeSequenceRef.current = 0;
        const layoutTopology = new ReduxLayoutTopology({
          getState: () => storeRef.current?.getState(),
          getRuntimeGraph: () => runtimeGraphRef.current,
        });
        const layoutController = new GraphLayoutController({
          getNodes: () => layoutTopology.getNodes(),
          getEdges: () => layoutTopology.getEdges(),
          onTick: notifyWorkspaceChanged,
        });
        layoutControllerRef.current = layoutController;
        const createdWorkspace = (runtimeGraphRef.current = createRuntimeGraph());
        return createdWorkspace;
      },
      getRuntimeGraph: () => runtimeGraphRef.current,
      getLayoutController: () => layoutControllerRef.current,
      savePolicy: graphSavePolicy,
      contentClient,
      changeUrl: (newUrl) => history.push(newUrl),
      notifyReact: notifyWorkspaceChanged,
      handleSearchQueryError,
      exploreGraph,
      searchGraph,
      mergeRuntimeGraph,
      ...coreStart,
    })
  );
  storeRef.current = store;

  const loaded = useWorkspaceLoader({
    runtimeGraphRef,
    store,
    contentClient,
    spaces,
    coreStart,
    data,
  });

  if (!loaded) {
    return null;
  }

  const { savedWorkspace, sharingSavedObjectProps } = loaded;

  return (
    <KibanaContextProvider services={services}>
      <Provider store={store}>
        <WorkspaceLayout
          spaces={spaces}
          sharingSavedObjectProps={sharingSavedObjectProps}
          workspace={runtimeGraphRef.current}
          loading={loading}
          graphSavePolicy={graphSavePolicy}
          capabilities={capabilities}
          coreStart={coreStart}
          canEditDrillDownUrls={canEditDrillDownUrls}
          overlays={overlays}
          savedWorkspace={savedWorkspace}
          indexPatternProvider={indexPatternProvider}
          getMergeCandidates={getMergeCandidates}
          inspect={inspect}
          requestAdapter={requestAdapter}
        />
      </Provider>
    </KibanaContextProvider>
  );
};
