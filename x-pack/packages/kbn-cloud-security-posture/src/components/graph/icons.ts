/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentIcon } from '@kbn/custom-icons';
import cytoscape from 'cytoscape';

export function iconForNode(node: cytoscape.NodeSingular) {
  // TODO: KFIR
  return getAgentIcon('rum-js', false);
}
