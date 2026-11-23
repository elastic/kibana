/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoopStepTypes } from '@kbn/workflows';
import type { ScopeData } from '../../workflow_context_manager/workflow_scope_stack';

const loopEnterNodeTypes = new Set<string>(LoopStepTypes.map((t) => `enter-${t}`));

export const isLoopEnterScope = (scope: ScopeData): boolean =>
  loopEnterNodeTypes.has(scope.nodeType);
