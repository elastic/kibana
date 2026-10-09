/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_EPISODE_SOURCE_ID } from './constants';
import { CLASSIC_EPISODE_SOURCE_ID } from './classic_alerts/constants';
import { ELASTIC_SOURCE_ICON, getEpisodeSourceIcon, getEpisodeSourceLabel } from './source_labels';

describe('getEpisodeSourceLabel', () => {
  it('names Universal alerting when the row has no source id', () => {
    expect(getEpisodeSourceLabel()).toBe('Universal alerting');
    expect(getEpisodeSourceLabel(ALERTING_V2_EPISODE_SOURCE_ID)).toBe('Universal alerting');
  });

  it('names Classic alerting for classic rows', () => {
    expect(getEpisodeSourceLabel(CLASSIC_EPISODE_SOURCE_ID)).toBe('Classic alerting');
  });

  it('keeps a registered label for any other source', () => {
    expect(getEpisodeSourceLabel('slo', [{ id: 'slo', label: 'SLO burn rate' }])).toBe(
      'SLO burn rate'
    );
  });

  it('falls back to the source id when that source did not register a label', () => {
    expect(getEpisodeSourceLabel('custom')).toBe('custom');
  });
});

describe('getEpisodeSourceIcon', () => {
  it('uses the Elastic logo for native ES|QL rows', () => {
    expect(getEpisodeSourceIcon()).toBe(ELASTIC_SOURCE_ICON);
    expect(getEpisodeSourceIcon(ALERTING_V2_EPISODE_SOURCE_ID)).toBe(ELASTIC_SOURCE_ICON);
  });

  it('uses the icon a registered source declares', () => {
    expect(
      getEpisodeSourceIcon(CLASSIC_EPISODE_SOURCE_ID, [
        { id: CLASSIC_EPISODE_SOURCE_ID, icon: ELASTIC_SOURCE_ICON },
      ])
    ).toBe(ELASTIC_SOURCE_ICON);
    expect(getEpisodeSourceIcon('slo', [{ id: 'slo', icon: 'logoObservability' }])).toBe(
      'logoObservability'
    );
  });

  it('has no icon when a registered source declares none', () => {
    expect(getEpisodeSourceIcon('slo', [{ id: 'slo' }])).toBeUndefined();
  });

  it('has no icon for an unknown source id', () => {
    expect(getEpisodeSourceIcon('zabbix')).toBeUndefined();
  });
});
