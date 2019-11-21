/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRequiredPlugins } from '.';

// This test is a temporary test which is so we do not accidentally check-in
// feature flags turned on from "alerting" and "actions". If those get
// turned on during a check-in it will cause everyone's Kibana to not start.
// Once alerting and actions are part of the plugins by default this test
// should be removed.
describe('siem plugin tests', () => {
  describe('getRequiredPlugins', () => {
    test('null settings returns regular kibana and elasticsearch plugins', () => {
      expect(getRequiredPlugins(null, null)).toEqual(['kibana', 'elasticsearch']);
    });

    test('undefined settings returns regular kibana and elasticsearch plugins', () => {
      expect(getRequiredPlugins(undefined, undefined)).toEqual(['kibana', 'elasticsearch']);
    });

    test('alertingFeatureEnabled being false returns regular kibana and elasticsearch plugins', () => {
      expect(getRequiredPlugins('false', undefined)).toEqual(['kibana', 'elasticsearch']);
    });

    test('alertingFeatureEnabled being true returns action and alerts', () => {
      expect(getRequiredPlugins('true', undefined)).toEqual([
        'kibana',
        'elasticsearch',
        'alerting',
        'actions',
      ]);
    });

    test('alertingFeatureEnabled being false but a string for siemIndex returns alerting and actions', () => {
      expect(getRequiredPlugins('false', '.siem-signals-frank')).toEqual([
        'kibana',
        'elasticsearch',
        'alerting',
        'actions',
      ]);
    });

    test('alertingFeatureEnabled being true and a string for siemIndex returns alerting and actions', () => {
      expect(getRequiredPlugins('true', '.siem-signals-frank')).toEqual([
        'kibana',
        'elasticsearch',
        'alerting',
        'actions',
      ]);
    });

    test('alertingFeatureEnabled being true and an empty string for siemIndex returns regular kibana and elasticsearch plugins', () => {
      expect(getRequiredPlugins(undefined, '')).toEqual(['kibana', 'elasticsearch']);
    });

    test('alertingFeatureEnabled being true and a string of spaces for siemIndex returns regular kibana and elasticsearch plugins', () => {
      expect(getRequiredPlugins(undefined, '   ')).toEqual(['kibana', 'elasticsearch']);
    });

    test('alertingFeatureEnabled being null and a string for siemIndex returns alerting and actions', () => {
      expect(getRequiredPlugins(null, '.siem-signals-frank')).toEqual([
        'kibana',
        'elasticsearch',
        'alerting',
        'actions',
      ]);
    });

    test('alertingFeatureEnabled being undefined and a string for siemIndex returns alerting and actions', () => {
      expect(getRequiredPlugins(undefined, '.siem-signals-frank')).toEqual([
        'kibana',
        'elasticsearch',
        'alerting',
        'actions',
      ]);
    });
  });
});
