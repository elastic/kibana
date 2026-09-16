/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_BUILTIN_TOOLS } from '@kbn/agent-builder-server/allow_lists';
import { DECISION_TREE_TOOL_IDS } from '.';

// Agent Builder rejects an unlisted built-in tool at registration, which takes Kibana down on
// boot rather than failing anything these tools are unit tested through.
it('registers every decision-tree tool in the Agent Builder allow list', () => {
  expect(AGENT_BUILDER_BUILTIN_TOOLS).toEqual(expect.arrayContaining([...DECISION_TREE_TOOL_IDS]));
});
