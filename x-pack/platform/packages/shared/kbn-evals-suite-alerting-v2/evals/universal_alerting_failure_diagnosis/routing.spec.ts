/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  RULE_AUTHORING_SKILL_ID,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
} from '../../src/constants';
import { diagnosisInput } from '../../src/failure_diagnosis';
import { DIAGNOSIS_WEB_INDEX } from '../../src/failure_diagnosis_data';

evaluate.describe(
  'Alerting V2 universal-alerting-failure-diagnosis skill - routing',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('skill routing', async ({ evaluateDataset, failureDiagnosisRules }) => {
      const { breachSegmentTypo } = failureDiagnosisRules;
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: failure diagnosis routing',
          description:
            'The "Diagnose with AI" badge prompt and plain "why did my rule fail" questions load the ' +
            'diagnosis skill; rule creation requests still load rule-authoring.',
          examples: [
            {
              input: diagnosisInput(breachSegmentTypo),
              output: {
                criteria: [
                  'The assistant diagnoses the failed execution instead of composing a new rule from scratch.',
                ],
                expectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
                notExpectedSkills: [RULE_AUTHORING_SKILL_ID],
              },
            },
            {
              input: {
                turns: [
                  `Why did my alerting rule "${breachSegmentTypo.name}" fail? The execution history shows this error:\n\n${breachSegmentTypo.scenario.error}`,
                ],
              },
              output: {
                criteria: [
                  'The assistant explains why the rule failed from the error message and suggests a fix, rather than composing a new rule.',
                ],
                expectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
              },
            },
            {
              input: {
                turns: [
                  `Create an alerting rule that fires when a host in ${DIAGNOSIS_WEB_INDEX} returns more than 10 HTTP 5xx responses in 5 minutes.`,
                ],
              },
              output: {
                criteria: [
                  'The assistant composes a new Alerting V2 rule and does not treat the request as a failure diagnosis.',
                ],
                expectedSkills: [RULE_AUTHORING_SKILL_ID],
                notExpectedSkills: [UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID],
              },
            },
            {
              input: {
                turns: [
                  'My alerting action policy did not send any notification for an active alert. Why did its workflow fail?',
                ],
              },
              output: {
                criteria: [
                  'The assistant does not guess a cause for the action policy or workflow failure, and says that diagnosing it is outside what it can do here (only rule execution failures are covered).',
                ],
              },
            },
          ],
        },
      });
    });
  }
);
