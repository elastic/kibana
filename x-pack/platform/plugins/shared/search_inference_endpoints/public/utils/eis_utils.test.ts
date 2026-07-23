/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { EisModelStatus } from '../../common/types';
import type { EisInferenceEndpoint } from '../../common/types';
import {
  getModelEOLDate,
  getModelStatus,
  isModelDeprecated,
  isModelEndOfLifeReached,
  getGeoDisplayName,
  getRegionDisplayName,
  getAvailableRegions,
  getAvailableGeos,
  getRegionZoneCounts,
  getZoneGroups,
} from './eis_utils';

const makeEndpoint = (
  modelId: string,
  regions: Array<{ csp: string; region: string; geo?: string }>
): EisInferenceEndpoint =>
  ({
    inference_id: `.${modelId}`,
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: { model_id: modelId },
    metadata: { regions },
  } as unknown as EisInferenceEndpoint);

const makeMetadata = (
  overrides: NonNullable<EisInferenceEndpointMetadata['heuristics']>
): EisInferenceEndpointMetadata => ({
  heuristics: overrides,
});

describe('eis utility functions', function () {
  describe('isModelEndOfLifeReached', function () {
    it('returns false when metadata is undefined', () => {
      expect(isModelEndOfLifeReached(undefined)).toBe(false);
    });

    it('returns false when end_of_life_date is absent', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('returns true when end_of_life_date is in the past', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ end_of_life_date: '2020-01-01' }))).toBe(true);
    });

    it('returns false when end_of_life_date is in the future', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ end_of_life_date: '2099-01-01' }))).toBe(false);
    });
  });

  describe('getModelEOLDate', function () {
    it('returns undefined when metadata is undefined', () => {
      expect(getModelEOLDate(undefined)).toBeUndefined();
    });

    it('returns undefined when end_of_life_date is absent', () => {
      expect(getModelEOLDate(makeMetadata({ status: 'ga' }))).toBeUndefined();
    });

    it('returns a Moment for a valid end_of_life_date', () => {
      const result = getModelEOLDate(makeMetadata({ end_of_life_date: '2026-04-15' }));
      expect(result).toBeDefined();
      expect(result?.format('YYYY-MM-DD')).toBe('2026-04-15');
    });
  });

  describe('isModelDeprecated', function () {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-13'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false when metadata is undefined', () => {
      expect(isModelDeprecated(undefined)).toBe(false);
    });

    it('returns false when no EOL date and status is ga', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('returns true when status is deprecated and no EOL date', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'deprecated' }))).toBe(true);
    });

    it('returns true when EOL date is within the next 30 days', () => {
      expect(isModelDeprecated(makeMetadata({ end_of_life_date: '2026-06-01' }))).toBe(true);
    });

    it('returns false when EOL date is more than 30 days in the future', () => {
      expect(isModelDeprecated(makeMetadata({ end_of_life_date: '2026-07-01' }))).toBe(false);
    });
  });

  describe('getModelStatus', function () {
    it('returns Unknown when metadata is undefined', () => {
      expect(getModelStatus(undefined)).toBe(EisModelStatus.Unknown);
    });

    it('returns Unknown when heuristics is absent', () => {
      expect(getModelStatus({})).toBe(EisModelStatus.Unknown);
    });

    it('returns Unknown when status is an unrecognized value', () => {
      expect(getModelStatus(makeMetadata({ status: 'beta' }))).toBe(EisModelStatus.Unknown);
    });

    it('returns GA when status is ga', () => {
      expect(getModelStatus(makeMetadata({ status: 'ga' }))).toBe(EisModelStatus.GA);
    });

    it('returns Preview when status is preview', () => {
      expect(getModelStatus(makeMetadata({ status: 'preview' }))).toBe(EisModelStatus.Preview);
    });

    it('returns Deprecated when status is deprecated and EOL date is in the future', () => {
      expect(
        getModelStatus(makeMetadata({ status: 'deprecated', end_of_life_date: '2099-01-01' }))
      ).toBe(EisModelStatus.Deprecated);
    });

    it('returns Deprecated when EOL date is within the next 30 days regardless of status', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-13'));
      try {
        expect(getModelStatus(makeMetadata({ status: 'ga', end_of_life_date: '2026-06-01' }))).toBe(
          EisModelStatus.Deprecated
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns DeprecatedEOL when EOL date is in the past regardless of status', () => {
      expect(
        getModelStatus(makeMetadata({ status: 'deprecated', end_of_life_date: '2020-01-01' }))
      ).toBe(EisModelStatus.DeprecatedEOL);
    });

    it('returns DeprecatedEOL when EOL date is in the past even when status is ga', () => {
      expect(getModelStatus(makeMetadata({ status: 'ga', end_of_life_date: '2020-01-01' }))).toBe(
        EisModelStatus.DeprecatedEOL
      );
    });
  });
});

describe('getGeoDisplayName', () => {
  it('returns "North America" for "us"', () => {
    expect(getGeoDisplayName('us')).toBe('North America');
  });

  it('returns "Europe" for "eu"', () => {
    expect(getGeoDisplayName('eu')).toBe('Europe');
  });

  it('returns "Asia Pacific" for "apac"', () => {
    expect(getGeoDisplayName('apac')).toBe('Asia Pacific');
  });

  it('returns "Other" for "other"', () => {
    expect(getGeoDisplayName('other')).toBe('Other');
  });

  it('falls back to the raw geo code for unknown values', () => {
    expect(getGeoDisplayName('mea')).toBe('mea');
  });
});

describe('getRegionDisplayName', () => {
  it('returns the registered display name and uppercase CSP for a known region', () => {
    // us-east-1 is registered in REGION_DISPLAY_NAMES
    expect(getRegionDisplayName({ csp: 'aws', region: 'us-east-1', geo: 'us' })).toBe(
      'US East (N. Virginia) - AWS'
    );
  });

  it('falls back to the raw region code when no display name is registered', () => {
    expect(getRegionDisplayName({ csp: 'aws', region: 'unknown-region-99', geo: 'us' })).toBe(
      'unknown-region-99 - AWS'
    );
  });

  it('uppercases the CSP label', () => {
    expect(getRegionDisplayName({ csp: 'gcp', region: 'europe-west1', geo: 'eu' })).toMatch(
      / - GCP$/
    );
  });
});

describe('getAvailableRegions', () => {
  it('returns an empty array when no endpoints are provided', () => {
    expect(getAvailableRegions([])).toEqual([]);
  });

  it('returns an empty array when no endpoint has metadata', () => {
    const ep = { inference_id: '.elser-2', service: 'elastic' } as unknown as EisInferenceEndpoint;
    expect(getAvailableRegions([ep])).toEqual([]);
  });

  it('returns regions from a single endpoint', () => {
    const ep = makeEndpoint('elser-v2', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    ]);
    const result = getAvailableRegions([ep]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => `${r.csp}::${r.region}`)).toEqual([
      'aws::us-east-1',
      'gcp::europe-west1',
    ]);
  });

  it('deduplicates regions that appear across multiple endpoints', () => {
    const ep1 = makeEndpoint('elser-v2', [{ csp: 'aws', region: 'us-east-1', geo: 'us' }]);
    const ep2 = makeEndpoint('e5-small', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' }, // duplicate
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    ]);
    const result = getAvailableRegions([ep1, ep2]);
    expect(result).toHaveLength(2);
  });

  it('sorts results alphabetically by csp then region', () => {
    const ep = makeEndpoint('elser-v2', [
      { csp: 'gcp', region: 'us-east4', geo: 'us' },
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
    ]);
    const result = getAvailableRegions([ep]);
    expect(result.map((r) => `${r.csp}::${r.region}`)).toEqual([
      'aws::eu-west-1',
      'aws::us-east-1',
      'gcp::us-east4',
    ]);
  });

  it('skips entries that are not valid CspRegion objects', () => {
    const ep = {
      inference_id: '.elser-2',
      service: 'elastic',
      service_settings: { model_id: 'elser-v2' },
      metadata: { regions: ['not-an-object', { csp: 'aws', region: 'us-east-1' }, null] },
    } as unknown as EisInferenceEndpoint;
    const result = getAvailableRegions([ep]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ csp: 'aws', region: 'us-east-1' });
  });
});

describe('getRegionZoneCounts', () => {
  it('returns an empty array when both inputs are empty', () => {
    expect(getRegionZoneCounts([], [])).toEqual([]);
  });

  it('returns an empty array when the model endpoint has no regions', () => {
    const allEp = makeEndpoint('e5-small', [{ csp: 'aws', region: 'us-east-1', geo: 'us' }]);
    const modelEp = {
      inference_id: '.elser-2',
      service: 'elastic',
      service_settings: { model_id: 'elser-v2' },
    } as unknown as EisInferenceEndpoint;
    expect(getRegionZoneCounts([modelEp], [allEp])).toEqual([]);
  });

  it('returns the correct X/Y counts per geo zone', () => {
    // ELSER v2: 1 EU region, 2 US regions
    const elserEp = makeEndpoint('elser-v2', [
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'gcp', region: 'us-east4', geo: 'us' },
    ]);
    // E5 Small adds a second EU region and an APAC region
    const e5Ep = makeEndpoint('e5-small', [
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
      { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
    ]);

    const result = getRegionZoneCounts([elserEp], [elserEp, e5Ep]);

    // EU: ELSER has 1, total across all is 2
    const eu = result.find((r) => r.geo === 'eu');
    expect(eu).toBeDefined();
    expect(eu?.modelCount).toBe(1);
    expect(eu?.totalCount).toBe(2);

    // US: ELSER has 2, total is 2
    const us = result.find((r) => r.geo === 'us');
    expect(us).toBeDefined();
    expect(us?.modelCount).toBe(2);
    expect(us?.totalCount).toBe(2);

    // APAC: ELSER has 0 → no entry returned
    const apac = result.find((r) => r.geo === 'apac');
    expect(apac).toBeUndefined();
  });

  it('does not return zones where the model has no regions (modelCount === 0)', () => {
    const modelEp = makeEndpoint('elser-v2', [{ csp: 'aws', region: 'us-east-1', geo: 'us' }]);
    const otherEp = makeEndpoint('e5-small', [{ csp: 'gcp', region: 'europe-west1', geo: 'eu' }]);
    const result = getRegionZoneCounts([modelEp], [modelEp, otherEp]);
    expect(result.every((r) => r.geo !== 'eu')).toBe(true);
  });

  it('populates modelRegions with the correct CspRegion entries for tooltip use', () => {
    const modelEp = makeEndpoint('elser-v2', [
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    ]);
    const result = getRegionZoneCounts([modelEp], [modelEp]);
    const eu = result.find((r) => r.geo === 'eu');
    expect(eu?.modelRegions).toHaveLength(2);
    expect(eu?.modelRegions.map((r) => r.region)).toEqual(
      expect.arrayContaining(['eu-west-1', 'europe-west1'])
    );
  });

  it('deduplicates regions within a zone across multiple endpoints for the same model', () => {
    // Same region listed on two different endpoints for the same model
    const ep1 = makeEndpoint('elser-v2', [{ csp: 'aws', region: 'us-east-1', geo: 'us' }]);
    const ep2 = makeEndpoint('elser-v2', [{ csp: 'aws', region: 'us-east-1', geo: 'us' }]);
    const result = getRegionZoneCounts([ep1, ep2], [ep1, ep2]);
    const us = result.find((r) => r.geo === 'us');
    expect(us?.modelCount).toBe(1);
    expect(us?.totalCount).toBe(1);
  });
});

describe('getAvailableGeos', () => {
  it('returns an empty array when there are no endpoints', () => {
    expect(getAvailableGeos([])).toEqual([]);
  });

  it('collects unique geo codes from CspRegion entries', () => {
    const ep = makeEndpoint('model', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    ]);
    const result = getAvailableGeos([ep]);
    expect(result).toContain('us');
    expect(result).toContain('eu');
  });

  it('deduplicates geo codes across regions and endpoints', () => {
    const ep1 = makeEndpoint('model-a', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'gcp', region: 'us-central1', geo: 'us' },
    ]);
    const ep2 = makeEndpoint('model-b', [{ csp: 'aws', region: 'us-west-2', geo: 'us' }]);
    const result = getAvailableGeos([ep1, ep2]);
    expect(result.filter((g) => g === 'us')).toHaveLength(1);
  });

  it('orders known geos by GEO_ORDER and appends unknown geos alphabetically', () => {
    const ep = makeEndpoint('model', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
      { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
      { csp: 'aws', region: 'me-central-1', geo: 'mea' },
    ]);
    const result = getAvailableGeos([ep]);
    // GEO_ORDER: apac, eu, us, other → present geos: apac, eu, us (in GEO_ORDER order)
    // unknown: mea (appended alphabetically)
    expect(result).toEqual(['apac', 'eu', 'us', 'mea']);
  });

  it('places multiple unknown geos in alphabetical order after known geos', () => {
    const ep = makeEndpoint('model', [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'aws', region: 'za-north-1', geo: 'ssa' },
      { csp: 'aws', region: 'me-central-1', geo: 'mea' },
    ]);
    const result = getAvailableGeos([ep]);
    expect(result).toEqual(['us', 'mea', 'ssa']);
  });

  it('returns an empty array when no endpoints have metadata', () => {
    const bare = {
      inference_id: '.bare',
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: { model_id: 'bare' },
    } as unknown as EisInferenceEndpoint;
    expect(getAvailableGeos([bare])).toEqual([]);
  });
});

describe('getZoneGroups', () => {
  it('returns an empty array when no regions are provided', () => {
    expect(getZoneGroups([])).toEqual([]);
  });

  it('groups regions by their geo code', () => {
    const regions = [
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
      { csp: 'gcp', region: 'us-central1', geo: 'us' },
    ];
    const groups = getZoneGroups(regions);
    const geos = groups.map((g) => g.geo);
    expect(geos).toContain('us');
    expect(geos).toContain('eu');
    const usGroup = groups.find((g) => g.geo === 'us');
    expect(usGroup?.regions).toHaveLength(2);
  });

  it('orders groups by GEO_ORDER: known geos first in order, then unknowns alphabetically', () => {
    const regions = [
      { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
      { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
      { csp: 'aws', region: 'us-east-1', geo: 'us' },
      { csp: 'aws', region: 'me-south-1', geo: 'mea' },
    ];
    const groups = getZoneGroups(regions);
    const geos = groups.map((g) => g.geo);
    // GEO_ORDER = ['apac', 'eu', 'us', 'other'] — 'mea' is unknown, appended last
    expect(geos.indexOf('apac')).toBeLessThan(geos.indexOf('eu'));
    expect(geos.indexOf('eu')).toBeLessThan(geos.indexOf('us'));
    expect(geos[geos.length - 1]).toBe('mea');
  });

  it('falls back to "other" for regions without a geo', () => {
    const regions = [{ csp: 'aws', region: 'unknown-1' }];
    const groups = getZoneGroups(regions);
    expect(groups).toHaveLength(1);
    expect(groups[0].geo).toBe('other');
  });

  it('sets the displayName via getGeoDisplayName', () => {
    const regions = [{ csp: 'aws', region: 'us-east-1', geo: 'us' }];
    const groups = getZoneGroups(regions);
    expect(groups[0].displayName).toBe('North America');
  });
});
