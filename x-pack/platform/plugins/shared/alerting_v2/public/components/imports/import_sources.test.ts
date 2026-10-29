/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-types';
import {
  buildImportSources,
  CUSTOM_WEBHOOK_SOURCE_ID,
  filterImportSources,
  getManagedExamplePayload,
} from './import_sources';

const datadog: ActionType = {
  id: '.datadog',
  name: 'Datadog',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: ['workflows', 'importAlerts'],
  isSystemActionType: false,
  isDeprecated: false,
  isExperimental: true,
  description: 'Monitors, downtimes and incidents in Datadog',
};

describe('buildImportSources', () => {
  it('puts the custom webhook first, then connector sources, then the coming soon vendors', () => {
    const sources = buildImportSources([datadog]);

    expect(sources[0]).toMatchObject({ id: CUSTOM_WEBHOOK_SOURCE_ID, kind: 'custom' });
    expect(sources[1]).toMatchObject({
      id: '.datadog',
      kind: 'connector',
      title: 'Datadog',
      iconConnectorTypeId: '.datadog',
      isTechnicalPreview: true,
    });
    const rest = sources.slice(2);
    expect(rest.length).toBeGreaterThan(0);
    expect(rest.every(({ kind }) => kind === 'comingSoon')).toBe(true);
    expect(rest.map(({ title }) => title)).toEqual(
      expect.arrayContaining(['Zabbix', 'Dynatrace', 'Grafana', 'New Relic', 'AWS CloudWatch'])
    );
  });

  it('only lists the custom webhook and the coming soon vendors when no connector qualifies', () => {
    const sources = buildImportSources([]);

    expect(sources.filter(({ kind }) => kind === 'connector')).toEqual([]);
    expect(sources[0].kind).toBe('custom');
  });

  it('gives a source a reason when the license does not cover its connector', () => {
    const [, source] = buildImportSources([{ ...datadog, enabledInLicense: false }]);

    expect(source.disabledReason).toBe('Requires a enterprise license.');
  });

  it('never makes a coming soon vendor selectable', () => {
    buildImportSources([])
      .filter(({ kind }) => kind === 'comingSoon')
      .forEach((source) => expect(source.disabledReason).toBeDefined());
  });
});

describe('filterImportSources', () => {
  const sources = buildImportSources([datadog]);

  it('returns everything for an empty search', () => {
    expect(filterImportSources(sources, '  ')).toBe(sources);
  });

  it('matches on the title, ignoring case', () => {
    expect(filterImportSources(sources, 'zabb').map(({ title }) => title)).toEqual(['Zabbix']);
  });

  it('matches on the description', () => {
    expect(filterImportSources(sources, 'downtimes').map(({ id }) => id)).toEqual(['.datadog']);
  });
});

describe('getManagedExamplePayload', () => {
  it('has a Datadog shaped body', () => {
    expect(getManagedExamplePayload('.datadog')).toMatchObject({
      monitor_id: expect.any(String),
      scopes: expect.any(Array),
    });
  });

  it('has nothing for an unknown type', () => {
    expect(getManagedExamplePayload('.unknown')).toBeUndefined();
  });
});
