/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { OutputRuleAlertRest } from '../../types';
import { HapiReadableStream } from '../../rules/types';

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
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRuleWithId = (id = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  id,
  severity: 'high',
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * Given an array of rules, builds an NDJSON string of rules
 * as we might import/export
 * @param rules Array of rule objects with which to generate rule JSON
 */
export const rulesToNdJsonString = (rules: Array<Partial<OutputRuleAlertRest>>) => {
  return rules.map(rule => JSON.stringify(rule)).join('\r\n');
};

/**
 * Given an array of rule IDs, builds an NDJSON string of rules
 * as we might import/export
 * @param ruleIds Array of ruleIds with which to generate rule JSON
 */
export const ruleIdsToNdJsonString = (ruleIds: string[]) => {
  const rules = ruleIds.map(ruleId => getSimpleRule(ruleId));
  return rulesToNdJsonString(rules);
};

/**
 * Given a string, builds a hapi stream as our
 * route handler would receive it.
 * @param string contents of the stream
 * @param filename String to declare file extension
 */
export const buildHapiStream = (string: string, filename = 'file.ndjson'): HapiReadableStream => {
  const HapiStream = class extends Readable {
    public readonly hapi: { filename: string };
    constructor(fileName: string) {
      super();
      this.hapi = { filename: fileName };
    }
  };

  const stream = new HapiStream(filename);
  stream.push(string);
  stream.push(null);

  return stream;
};
