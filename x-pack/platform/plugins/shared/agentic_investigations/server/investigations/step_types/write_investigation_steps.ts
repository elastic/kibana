/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  createInvestigationStepCommonDefinition,
  patchInvestigationStepCommonDefinition,
  setHypothesesStepCommonDefinition,
  type CreateInvestigationStepInput,
  type PatchInvestigationStepInput,
} from '../../../common/investigations/step_types';
import type { Hypothesis } from '../../../common/hypotheses';
import type { InvestigationsClient } from '../services/investigations_client';
import type { FindingsWriter } from '../../findings/findings_writer';
import { parseStepInput } from '../../impact/step_types/parse_step_input';
import { toStepError } from './to_step_error';

interface WriteStepDeps {
  getInvestigationsClient: (request: KibanaRequest) => InvestigationsClient;
}

/** The Worker workflow is the actor of a case its investigation opens or changes. */
const getWorkflowActor = (context: StepHandlerContext) => {
  const { workflow, execution } = context.contextManager.getContext();
  return {
    type: 'workflow' as const,
    id: workflow.id,
    name: workflow.name,
    run_id: execution.id,
  };
};

/** `ai.conversation.create` for investigations: same input and output, plus `case_id`. */
export const getCreateInvestigationStepDefinition = ({ getInvestigationsClient }: WriteStepDeps) =>
  createServerStepDefinition({
    ...createInvestigationStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const input = context.input as CreateInvestigationStepInput;
        const output = await getInvestigationsClient(request).create(input, {
          source: 'workflow',
          actionSource: getWorkflowActor(context),
        });
        return { output };
      } catch (error) {
        // As `ai.conversation.create`: the Worker YAML reads `steps.<name>.error`.
        return { error };
      }
    },
  });

/** `ai.conversation.metadata.patch` for investigations: same input and output. */
export const getPatchInvestigationStepDefinition = ({ getInvestigationsClient }: WriteStepDeps) =>
  createServerStepDefinition({
    ...patchInvestigationStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const input = context.input as PatchInvestigationStepInput;
        const output = await getInvestigationsClient(request).patchMetadata(input, {
          source: 'workflow',
          actionSource: getWorkflowActor(context),
        });
        return { output };
      } catch (error) {
        return { error };
      }
    },
  });

/** Replaces an investigation's hypotheses from a workflow (the deterministic demo uses it). */
export const getSetHypothesesStepDefinition = ({
  getFindingsWriter,
}: {
  getFindingsWriter: (request: KibanaRequest) => FindingsWriter;
}) =>
  createServerStepDefinition({
    ...setHypothesesStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const input = parseStepInput(setHypothesesStepCommonDefinition.inputSchema, context.input);
        const request = context.contextManager.getFakeRequest();
        await getFindingsWriter(request).setHypotheses({
          conversationId: input.conversationId,
          hypotheses: input.hypotheses as Hypothesis[],
        });
        return { output: { count: input.hypotheses.length } };
      } catch (error) {
        throw toStepError(error, 'Failed to set hypotheses');
      }
    },
  });
