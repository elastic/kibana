/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIONS_SERIES_ID_EVAL, EVENTS_SERIES_ID_EVAL, SERIES_ID_EVAL } from './series_id_eval';

describe('series id ES|QL expressions', () => {
  it.each([
    ['SERIES_ID_EVAL', SERIES_ID_EVAL, 'COALESCE(`rule.id`, rule_id)'],
    ['EVENTS_SERIES_ID_EVAL', EVENTS_SERIES_ID_EVAL, '"::", `rule.id`, "::"'],
    ['ACTIONS_SERIES_ID_EVAL', ACTIONS_SERIES_ID_EVAL, '"::", rule_id, "::"'],
  ])('%s encodes the readable payload as base64url', (_name, evalCommand, ruleIdColumn) => {
    expect(evalCommand.startsWith('EVAL series_id = ')).toBe(true);
    expect(evalCommand).toContain(ruleIdColumn);
    expect(evalCommand).toContain('CONCAT("1::rule::", space_id, "::"');
    expect(evalCommand).toContain(
      'CONCAT("1::source::", space_id, "::", source, "::", group_hash)'
    );
    expect(evalCommand).toContain('source IS NULL OR source == "" OR source == "internal"');
    expect(evalCommand).toContain('TO_BASE64(');
    expect(evalCommand).toContain('"[+]", "-"');
    expect(evalCommand).toContain('"/", "_"');
    expect(evalCommand).toContain('"=+$", ""');
  });

  it('only differs between streams in the rule id column', () => {
    const normalize = (evalCommand: string, ruleIdColumn: string) =>
      evalCommand.replace(ruleIdColumn, '<rule_id>');

    expect(normalize(SERIES_ID_EVAL, 'COALESCE(`rule.id`, rule_id)')).toBe(
      normalize(EVENTS_SERIES_ID_EVAL, '`rule.id`')
    );
    expect(normalize(ACTIONS_SERIES_ID_EVAL, 'rule_id')).toBe(
      normalize(EVENTS_SERIES_ID_EVAL, '`rule.id`')
    );
  });
});
