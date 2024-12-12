/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PREFIX = 'cloudSecurityGraph' as const;

export const GRAPH_INVESTIGATION_TEST_ID = `${PREFIX}GraphInvestigation` as const;
export const GRAPH_NODE_EXPAND_POPOVER_TEST_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}GraphNodeExpandPopover` as const;
export const GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ExploreRelatedEntities` as const;
export const GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowActionsByEntity` as const;
export const GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowActionsOnEntity` as const;
