/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./update_asset_criticality').then((m) => m.updateAssetCriticalityStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./entity_graph_traversal/load_entity_graph_traversal_scenario_step').then(
      (m) => m.loadEntityGraphTraversalScenarioStepDefinition
    )
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./entity_graph_traversal/run_entity_graph_traversal_hop_step').then(
      (m) => m.runEntityGraphTraversalHopStepDefinition
    )
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./entity_graph_traversal/resolve_entity_graph_traversal_nodes_step').then(
      (m) => m.resolveEntityGraphTraversalNodesStepDefinition
    )
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./entity_graph_traversal/trace_entity_graph_traversal_routes_step').then(
      (m) => m.traceEntityGraphTraversalRoutesStepDefinition
    )
  );
};
