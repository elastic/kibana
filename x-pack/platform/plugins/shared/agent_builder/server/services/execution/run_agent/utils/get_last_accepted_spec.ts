/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { internalTools, isToolCallStep } from '@kbn/agent-builder-common';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Spec of the round's last `write_spec` call that was accepted, meaning it returned results and
 * none of them is an error.
 */
export const getLastAcceptedSpec = (steps: ConversationRoundStep[]): Composition | undefined => {
  const accepted = steps
    .filter(isToolCallStep)
    .filter(
      ({ tool_id: toolId, results }) =>
        toolId === internalTools.writeSpec && results.length > 0 && !results.some(isErrorResult)
    );

  return accepted.at(-1)?.params.spec;
};
