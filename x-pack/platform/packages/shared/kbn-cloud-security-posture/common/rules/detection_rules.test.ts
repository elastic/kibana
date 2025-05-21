/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CspBenchmarkRuleMetadata } from '../schema/rules/latest';
import { generateBenchmarkRuleTags, getFindingsDetectionRuleSearchTags } from './detection_rules';

it('Should generate search tags for a CSP benchmark rule', () => {
  const cspBenchmarkRule = {
    benchmark: {
      id: 'cis_gcp',
      rule_number: '1.1',
    },
  } as unknown as CspBenchmarkRuleMetadata;

  const result = getFindingsDetectionRuleSearchTags(cspBenchmarkRule);

  const expectedTags = ['CIS', 'GCP', 'CIS GCP 1.1'];
  expect(result).toEqual(expectedTags);
});

it('Should handle undefined benchmark object gracefully', () => {
  const cspBenchmarkRule = { benchmark: {} } as any;
  const expectedTags: string[] = [];
  const result = getFindingsDetectionRuleSearchTags(cspBenchmarkRule);
  expect(result).toEqual(expectedTags);
});

it('Should handle undefined rule number gracefully', () => {
  const cspBenchmarkRule = {
    benchmark: {
      id: 'cis_gcp',
    },
  } as unknown as CspBenchmarkRuleMetadata;
  const result = getFindingsDetectionRuleSearchTags(cspBenchmarkRule);
  const expectedTags = ['CIS', 'GCP', 'CIS GCP'];
  expect(result).toEqual(expectedTags);
});

it('Should generate tags for a CSPM benchmark rule', () => {
  const cspBenchmarkRule = {
    benchmark: {
      id: 'cis_gcp',
      rule_number: '1.1',
      posture_type: 'cspm',
    },
  } as unknown as CspBenchmarkRuleMetadata;

  const result = generateBenchmarkRuleTags(cspBenchmarkRule);

  const expectedTags = [
    'Cloud Security',
    'Use Case: Configuration Audit',
    'CIS',
    'GCP',
    'CIS GCP 1.1',
    'CSPM',
    'Data Source: CSPM',
    'Domain: Cloud',
  ];
  expect(result).toEqual(expectedTags);
});

it('Should generate tags for a KSPM benchmark rule', () => {
  const cspBenchmarkRule = {
    benchmark: {
      id: 'cis_gcp',
      rule_number: '1.1',
      posture_type: 'kspm',
    },
  } as unknown as CspBenchmarkRuleMetadata;

  const result = generateBenchmarkRuleTags(cspBenchmarkRule);

  const expectedTags = [
    'Cloud Security',
    'Use Case: Configuration Audit',
    'CIS',
    'GCP',
    'CIS GCP 1.1',
    'KSPM',
    'Data Source: KSPM',
    'Domain: Container',
  ];
  expect(result).toEqual(expectedTags);
});
