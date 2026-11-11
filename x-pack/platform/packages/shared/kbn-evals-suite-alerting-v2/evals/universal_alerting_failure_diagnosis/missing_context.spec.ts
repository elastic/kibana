/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
} from '../../src/constants';
import { diagnosisInput } from '../../src/failure_diagnosis';

const NO_INVENTED_RULE_CRITERION =
  'The assistant does not invent or assume a rule definition (index pattern, query, schedule) beyond what the error message shows.';

/*
 * The handoff carries only the failed execution, as it does when the saved rule
 * was deleted or the user cannot read it.
 */
evaluate.describe(
  'Alerting V2 universal-alerting-failure-diagnosis skill - missing context',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('no rule attachment', async ({ evaluateDataset, failureDiagnosisRules }) => {
      const { breachSegmentTypo, ownerWithoutRead } = failureDiagnosisRules;
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: failure diagnosis - missing rule attachment',
          description:
            'Without the rule attachment the agent diagnoses from the error alone and does not invent a rule definition.',
          examples: [
            {
              input: diagnosisInput(breachSegmentTypo, { includeRule: false }),
              output: {
                criteria: [
                  'The assistant says the rule definition was not provided (the rule may have been deleted, or the user may not have access to it).',
                  'The assistant still explains `Unknown column [server_error]` from the error alone, including the suggested `server_errors` column.',
                  NO_INVENTED_RULE_CRITERION,
                ],
                expectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
                notExpectedToolIds: [ALERTING_TOOL_IDS.manageRule],
              },
            },
            {
              input: diagnosisInput(ownerWithoutRead, { includeRule: false }),
              output: {
                criteria: [
                  'The assistant says the rule definition was not provided (the rule may have been deleted, or the user may not have access to it).',
                  'The assistant explains that `Unknown index` can mean the index does not exist or the rule owner cannot read it.',
                  NO_INVENTED_RULE_CRITERION,
                ],
                expectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
                notExpectedToolIds: [ALERTING_TOOL_IDS.manageRule],
              },
            },
          ],
        },
      });
    });
  }
);
