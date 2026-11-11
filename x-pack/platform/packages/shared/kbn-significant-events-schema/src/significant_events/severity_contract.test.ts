/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONFIDENCE_CONTRACT_RULE, SEVERITY_CONTRACT_RULE } from './common_schemas';
import {
  ASSESSMENT_NOTE_ROLE_RULE,
  DISCOVERY_SEVERITY_APPLICATION_RULE,
  SUMMARY_ROLE_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
} from './constants';

describe('severity contract', () => {
  const rules = {
    SEVERITY_CONTRACT_RULE,
    DISCOVERY_SEVERITY_APPLICATION_RULE,
  };

  it.each([
    'otherwise the share of log lines',
    'never moves the tier',
    'Not for a confirmed failing operation',
    'stays here even when every caller hits it',
  ])('no longer says "%s"', (phrase) => {
    Object.values(rules).forEach((rule) => expect(rule).not.toContain(phrase));
  });

  it.each([
    'stated failed outcome',
    'numerator and denominator',
    "dependent's own operation",
    'still happening',
    'volume, not how many attempts or users',
    'no share is needed',
    'which of outcome or reach is missing',
  ])('tells discovery how a tier is evidenced: "%s"', (phrase) => {
    expect(DISCOVERY_SEVERITY_APPLICATION_RULE).toContain(phrase);
  });

  it('no longer counts a KI edge alone as a dependent', () => {
    expect(DISCOVERY_SEVERITY_APPLICATION_RULE).not.toContain(
      'other services depend on per the blast'
    );
  });

  it.each([
    'name the missing outcome or reach',
    'knowledge gap',
    'none found in the knowledge base',
  ])('tells the assessment note: "%s"', (phrase) => {
    expect(ASSESSMENT_NOTE_ROLE_RULE).toContain(phrase);
  });

  it('keeps the symptom hypothesis to what the evidence supports', () => {
    expect(SYMPTOM_HYPOTHESIS_ROLE_RULE).toContain('only as far as the evidence supports');
  });

  it('formats the summary like the signal descriptions', () => {
    expect(SUMMARY_ROLE_RULE).toContain('in backticks');
    expect(SUMMARY_ROLE_RULE).toContain('Add no field, name, value or figure');
  });

  it('covers the measured scope, not one sampled row', () => {
    expect(SYMPTOM_HYPOTHESIS_ROLE_RULE).toContain('not one sampled row');
  });
});

describe('confidence contract', () => {
  it.each(['symptom', 'tier', 'weaker', 'second time', 'unknown'])('mentions "%s"', (phrase) => {
    expect(CONFIDENCE_CONTRACT_RULE).toContain(phrase);
  });

  it('no longer carves out an exception for doubt about the cause', () => {
    expect(CONFIDENCE_CONTRACT_RULE).not.toMatch(/doubt is the\scause/);
  });
});
