/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { diagnosisExample } from '../../src/failure_diagnosis';
import { DIAGNOSIS_WEB_INDEX } from '../../src/failure_diagnosis_data';

const NOT_FORCED_CRITERION =
  'The assistant does not force the error into an unrelated cause (for example a typo, a mapping problem, or missing privileges) when the error names a different problem.';

/*
 * Real run-time failures the skill does not list. They measure how well the
 * model's own Elasticsearch and ES|QL knowledge covers them, and whether the
 * skill's listed causes get in the way.
 */
evaluate.describe(
  'Alerting V2 universal-alerting-failure-diagnosis skill - unlisted failures',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'failures the skill does not list',
      async ({ evaluateDataset, failureDiagnosisRules }) => {
        const {
          missingEnrichPolicy,
          lookupJoinStandardIndex,
          noSuchRemoteCluster,
          unknownFunction,
          numericTimeField,
        } = failureDiagnosisRules;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: failure diagnosis - unlisted failures',
            description:
              'ENRICH with a missing policy, LOOKUP JOIN on a standard index, a missing remote cluster, ' +
              'an unknown ES|QL function, and a non-date time field.',
            examples: [
              diagnosisExample({
                seeded: missingEnrichPolicy,
                criteria: [
                  'The assistant explains that the enrich policy `host_owners` does not exist (or is not executed) on the cluster.',
                  'The assistant suggests creating and executing the enrich policy, or removing the `ENRICH` command from the query.',
                  NOT_FORCED_CRITERION,
                ],
                ruleChange: 'either',
              }),
              diagnosisExample({
                seeded: lookupJoinStandardIndex,
                criteria: [
                  `The assistant explains that \`LOOKUP JOIN\` requires an index in \`lookup\` mode and \`${DIAGNOSIS_WEB_INDEX}\` is a standard index.`,
                  'The assistant suggests joining against an index created with `index.mode: lookup`, or removing the join.',
                  NOT_FORCED_CRITERION,
                ],
                ruleChange: 'either',
              }),
              diagnosisExample({
                seeded: noSuchRemoteCluster,
                criteria: [
                  'The assistant explains that the `edge:` prefix refers to a remote cluster alias that is not configured on this cluster.',
                  'The assistant suggests configuring the `edge` remote cluster (an administrator task), or removing the prefix to read the local index.',
                  NOT_FORCED_CRITERION,
                ],
                ruleChange: 'either',
              }),
              diagnosisExample({
                seeded: unknownFunction,
                criteria: [
                  'The assistant explains that `PERCENT` is not an ES|QL function and that `PERCENTILE` is the intended aggregation.',
                  'The corrected rule uses `PERCENTILE(http.response.bytes, 95)`.',
                  NOT_FORCED_CRITERION,
                ],
                ruleChange: 'expected',
              }),
              diagnosisExample({
                seeded: numericTimeField,
                criteria: [
                  "The assistant explains that the rule's `time_field` is `http.response.bytes`, a numeric field, so the lookback time-range filter cannot parse the timestamp bounds.",
                  'The proposed fix sets `time_field` to a date field such as `@timestamp`.',
                  NOT_FORCED_CRITERION,
                ],
                ruleChange: 'expected',
              }),
            ],
          },
        });
      }
    );
  }
);
