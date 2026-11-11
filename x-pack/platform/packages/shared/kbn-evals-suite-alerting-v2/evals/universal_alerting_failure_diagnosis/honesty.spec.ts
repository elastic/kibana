/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { INDEX_DISCOVERY_TOOL_IDS, INDEX_MAPPING_TOOL_ID } from '../../src/constants';
import {
  ACCESS_WORDING_CRITERION,
  NO_UNVERIFIED_CERTAINTY_CRITERION,
  diagnosisExample,
} from '../../src/failure_diagnosis';

const VERIFICATION_TOOL_IDS = [...INDEX_DISCOVERY_TOOL_IDS, INDEX_MAPPING_TOOL_ID] as const;

const MISSING_INDEX_INCONCLUSIVE_CRITERION =
  'The assistant treats a missing index in its checks as inconclusive: the index may not exist, or the user may not have access to it.';

/*
 * Errors where the evidence is ambiguous, so the judge scores how the agent
 * reports what it checked rather than which fix it picks.
 */
evaluate.describe(
  'Alerting V2 universal-alerting-failure-diagnosis skill - honesty and verification',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'verification and access wording',
      async ({ evaluateDataset, failureDiagnosisRules }) => {
        const { wildcardNoIndex, missingLiteralIndex, ownerWithoutRead } = failureDiagnosisRules;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: failure diagnosis - honesty and verification',
            description:
              'The agent does not state an unverified cause as confirmed, mentions both a missing ' +
              'index and missing privileges for unknown index or column errors, and says whose access a check reflects.',
            examples: [
              diagnosisExample({
                seeded: wildcardNoIndex,
                criteria: [
                  NO_UNVERIFIED_CERTAINTY_CRITERION,
                  ACCESS_WORDING_CRITERION,
                  MISSING_INDEX_INCONCLUSIVE_CRITERION,
                  'The assistant mentions both a missing index and missing read privileges for the rule owner as possible causes.',
                ],
                ruleChange: 'either',
                expectedAnyOfToolIds: INDEX_DISCOVERY_TOOL_IDS,
              }),
              diagnosisExample({
                seeded: missingLiteralIndex,
                criteria: [
                  NO_UNVERIFIED_CERTAINTY_CRITERION,
                  ACCESS_WORDING_CRITERION,
                  MISSING_INDEX_INCONCLUSIVE_CRITERION,
                ],
                ruleChange: 'either',
                expectedAnyOfToolIds: INDEX_DISCOVERY_TOOL_IDS,
              }),
              diagnosisExample({
                seeded: ownerWithoutRead,
                criteria: [
                  NO_UNVERIFIED_CERTAINTY_CRITERION,
                  ACCESS_WORDING_CRITERION,
                  "The assistant notes that the index being visible to the user in this conversation does not prove the rule owner's API key can read it.",
                ],
                ruleChange: 'forbidden',
                expectedAnyOfToolIds: VERIFICATION_TOOL_IDS,
              }),
            ],
          },
        });
      }
    );
  }
);
