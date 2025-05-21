/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { RunContext } from '@kbn/onechat-server';

export const creatEmptyRunContext = (): RunContext => {
  return {
    runId: uuidv4(),
    stack: [],
  };
};

export const createChildContextForToolRun = ({
  toolId,
  parentContext,
}: {
  toolId: string;
  parentContext: RunContext;
}): RunContext => {
  return {
    ...parentContext,
    stack: [...parentContext.stack, { type: 'tool', toolId }],
  };
};
