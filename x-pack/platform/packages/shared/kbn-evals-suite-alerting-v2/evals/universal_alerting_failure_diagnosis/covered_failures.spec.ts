/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { INDEX_DISCOVERY_TOOL_IDS, INDEX_MAPPING_TOOL_ID } from '../../src/constants';
import { diagnosisExample } from '../../src/failure_diagnosis';
import {
  DIAGNOSIS_MISSING_LITERAL_INDEX,
  DIAGNOSIS_NO_MATCH_PATTERN,
  DIAGNOSIS_RULE_OWNER,
  DIAGNOSIS_WEB_INDEX,
} from '../../src/failure_diagnosis_data';

const VERIFICATION_TOOL_IDS = [...INDEX_DISCOVERY_TOOL_IDS, INDEX_MAPPING_TOOL_ID] as const;

/*
 * Each example hands over one failed execution the way the execution history
 * "Diagnose with AI" action does: the saved rule by reference plus the recorded
 * error. The rules are saved disabled, so the error text is the only failure signal.
 */
evaluate.describe(
  'Alerting V2 universal-alerting-failure-diagnosis skill - covered failures',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('query definition failures', async ({ evaluateDataset, failureDiagnosisRules }) => {
      const {
        breachSegmentTypo,
        missingLiteralIndex,
        typeMismatch,
        droppedColumn,
        recoveryQuery,
        noDataQuery,
      } = failureDiagnosisRules;
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: failure diagnosis - query definition failures',
          description:
            'Failures caused by the rule definition. The agent names the failing part of the rule, ' +
            'lists the right causes, and proposes a minimal fix through manage_rule.',
          examples: [
            diagnosisExample({
              seeded: breachSegmentTypo,
              criteria: [
                'The assistant says the failure is in the breach segment (`WHERE server_error > 10`), not in the base query.',
                'The assistant identifies `server_error` as a typo of the `server_errors` column computed by the base query.',
                'The corrected rule uses `server_errors` in the breach segment and leaves the base query unchanged.',
              ],
              ruleChange: 'expected',
            }),
            diagnosisExample({
              seeded: missingLiteralIndex,
              criteria: [
                `The assistant explains that \`${DIAGNOSIS_MISSING_LITERAL_INDEX}\` is reported as an unknown index, which means it does not exist or the rule owner cannot read it.`,
                `The assistant suggests reading from an existing index or a pattern (for example \`${DIAGNOSIS_WEB_INDEX}\`) instead of a concrete dated index name.`,
              ],
              ruleChange: 'either',
              expectedAnyOfToolIds: INDEX_DISCOVERY_TOOL_IDS,
            }),
            diagnosisExample({
              seeded: typeMismatch,
              criteria: [
                'The assistant identifies a type problem: the keyword field `host.name` is compared to the number 5.',
                'The proposed fix removes or corrects the comparison (for example comparing a numeric field or a string value) instead of changing the index or mappings.',
              ],
              ruleChange: 'expected',
            }),
            diagnosisExample({
              seeded: droppedColumn,
              criteria: [
                '`http.response.status_code` is mapped, and the assistant explains that the `STATS ... BY host.name` in the base query removed the column before the breach segment references it. It does not blame a typo, a mapping problem, or missing privileges.',
                'The proposed fix filters on `http.response.status_code` before the `STATS` (or computes the needed value in the `STATS`) so the breach condition can be evaluated.',
              ],
              ruleChange: 'expected',
            }),
            diagnosisExample({
              seeded: recoveryQuery,
              criteria: [
                'The assistant says the failure is in the recovery query, not in the base query or the breach segment.',
                'The assistant notes that the recovery query only runs when an active group stops breaching, so the failure can be intermittent.',
                'The corrected rule replaces `http.status` with `http.response.status_code` in the recovery query.',
              ],
              ruleChange: 'expected',
            }),
            diagnosisExample({
              seeded: noDataQuery,
              criteria: [
                'The assistant says the failure is in the no-data (presence) query, not in the base query.',
                `The assistant points out that the no-data query reads a different pattern (\`alerting-v2-eval-diagnosis-heartbeat-*\`) than the base query (\`${DIAGNOSIS_WEB_INDEX}\`), and that \`Unknown column [host.name]\` there means the pattern matched no readable index.`,
                'The proposed fix points the no-data query at the index the base query reads, or removes the custom presence query so the base query is reused.',
              ],
              ruleChange: 'expected',
            }),
          ],
        },
      });
    });

    evaluate(
      'access, limits and platform failures',
      async ({ evaluateDataset, failureDiagnosisRules }) => {
        const {
          wildcardNoIndex,
          ownerWithoutRead,
          securityException,
          oversizedResponse,
          timeout,
          platformError,
        } = failureDiagnosisRules;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: failure diagnosis - access, limits and platform failures',
            description:
              'Failures that are not (only) a query problem: missing indices or privileges, ' +
              'authorization errors, server limits, and platform errors.',
            examples: [
              diagnosisExample({
                seeded: wildcardNoIndex,
                criteria: [
                  `The assistant explains that \`Unknown column [host.name]\` for the wildcard pattern \`${DIAGNOSIS_NO_MATCH_PATTERN}\` means no readable index matched the pattern, so every referenced field is unknown, not that \`host.name\` is misspelled.`,
                  'The assistant lists both possible causes: no index matches the pattern, or the rule owner lacks read access to the matching indices.',
                ],
                ruleChange: 'either',
                expectedAnyOfToolIds: INDEX_DISCOVERY_TOOL_IDS,
              }),
              diagnosisExample({
                seeded: ownerWithoutRead,
                criteria: [
                  `The assistant checks that \`${DIAGNOSIS_WEB_INDEX}\` exists and is visible to the user in this conversation, and concludes the likely cause is that the rule owner's API key cannot read it.`,
                  'The assistant recommends granting the rule owner `read` (and `view_index_metadata`) on the index and re-saving the rule as a user with access to refresh its API key.',
                ],
                ruleChange: 'forbidden',
                expectedAnyOfToolIds: VERIFICATION_TOOL_IDS,
              }),
              diagnosisExample({
                seeded: securityException,
                criteria: [
                  `The assistant identifies an authorization failure: user \`${DIAGNOSIS_RULE_OWNER}\` is not allowed to run ES|QL reads on \`${DIAGNOSIS_WEB_INDEX}\`.`,
                  "The assistant recommends granting the missing index privilege to the rule owner's role and re-saving the rule to refresh its API key.",
                ],
                ruleChange: 'forbidden',
              }),
              diagnosisExample({
                seeded: oversizedResponse,
                criteria: [
                  'The assistant explains the query returns too much data because it has no `STATS` or `KEEP`.',
                  'The proposed fix aggregates with `STATS` (for example counting server errors per host) or keeps only the needed columns.',
                  'The assistant does not tell the user to raise `xpack.alerting_v2.rules.run.query.maxResponseSize` unless they administer the cluster.',
                ],
                ruleChange: 'expected',
              }),
              diagnosisExample({
                seeded: timeout,
                criteria: [
                  'The assistant identifies an execution timeout.',
                  'The assistant points at what makes the query expensive: the 30-day lookback, grouping by `@timestamp`, and `COUNT_DISTINCT`.',
                  'The assistant suggests making the query cheaper, and mentions that a cluster administrator can raise `xpack.alerting_v2.rules.run.timeout` only if the query is already cheap.',
                ],
                ruleChange: 'either',
              }),
              diagnosisExample({
                seeded: platformError,
                criteria: [
                  'The assistant identifies a platform or cluster problem (a write block from the disk flood-stage watermark), not a rule definition problem.',
                  'The assistant suggests freeing disk space or checking the cluster and the Kibana server logs.',
                ],
                ruleChange: 'forbidden',
              }),
            ],
          },
        });
      }
    );
  }
);
