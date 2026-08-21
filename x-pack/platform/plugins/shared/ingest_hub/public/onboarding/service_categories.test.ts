/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CATEGORY_ORDER, getCategoryTitle } from './service_categories';
import { AWS_SERVICES_STATIC } from './aws_service_matrix';

const EXPECTED_ORDER = [
  'security_identity_compliance',
  'compute',
  'networking_content_delivery',
  'storage',
  'databases',
  'analytics',
  'cloud_financial_management',
  'management_governance',
  'application_integration',
  'machine_learning',
  'containers',
] as const;

describe('service_categories', () => {
  it('CATEGORY_ORDER has exactly 11 entries', () => {
    expect(CATEGORY_ORDER).toHaveLength(11);
  });

  it('CATEGORY_ORDER matches the expected display order', () => {
    expect(CATEGORY_ORDER).toEqual(EXPECTED_ORDER);
  });

  it('getCategoryTitle returns a non-empty string for every slug in CATEGORY_ORDER', () => {
    for (const slug of CATEGORY_ORDER) {
      const title = getCategoryTitle(slug);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    }
  });

  it('every static matrix entry references a category in CATEGORY_ORDER', () => {
    const knownSlugs = new Set(CATEGORY_ORDER);
    for (const entry of AWS_SERVICES_STATIC) {
      if (entry.category !== undefined) {
        expect(knownSlugs).toContain(entry.category);
      }
    }
  });

  it('every slug in CATEGORY_ORDER that has entries is present in the static matrix', () => {
    // 'analytics' is reserved for future use and currently has no static entries — excluded.
    const CURRENTLY_POPULATED = CATEGORY_ORDER.filter((s) => s !== 'analytics');
    const usedSlugs = new Set(AWS_SERVICES_STATIC.map((e) => e.category));
    for (const slug of CURRENTLY_POPULATED) {
      expect(usedSlugs).toContain(slug);
    }
  });
});
