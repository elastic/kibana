/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OutputRuleAlertRest } from '../../types';

export const TEST_BOUNDARY = 'test_multipart_boundary';

// Not parsable due to extra colon following `name` property - name::
export const UNPARSABLE_LINE =
  '{"name"::"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-1","severity":"high","type":"query","query":"user.name: root or user.name: admin"}';

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRule = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * Given an array of rule_id strings this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param ruleIds Array of strings of rule_ids
 * @param isNdjson Boolean to determine file extension
 */
export const getSimpleRuleAsMultipartContent = (ruleIds: string[], isNdjson = true): Buffer => {
  const arrayOfRules = ruleIds.map(ruleId => {
    const simpleRule = getSimpleRule(ruleId);
    return JSON.stringify(simpleRule);
  });
  const stringOfRules = arrayOfRules.join('\r\n');

  const resultingPayload =
    `--${TEST_BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="rules.${
      isNdjson ? 'ndjson' : 'json'
    }\r\n` +
    'Content-Type: application/octet-stream\r\n' +
    '\r\n' +
    `${stringOfRules}\r\n` +
    `--${TEST_BOUNDARY}--\r\n`;

  return Buffer.from(resultingPayload);
};
