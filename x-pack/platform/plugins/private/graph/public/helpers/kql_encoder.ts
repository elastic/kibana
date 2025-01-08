/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';

import { Workspace } from '../types';

function escapeQuotes(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function asKQL(workspace: Workspace, joinBy: 'and' | 'or') {
  const nodes = workspace.returnUnpackedGroupeds(workspace.getSelectedOrAllNodes());
  const clauses = nodes.map(
    (node) => `"${escapeQuotes(node.data.field)}" : "${escapeQuotes(node.data.term)}"`
  );

  const expression = clauses.join(` ${joinBy} `);

  return encodeURIComponent(rison.encode(expression));
}
