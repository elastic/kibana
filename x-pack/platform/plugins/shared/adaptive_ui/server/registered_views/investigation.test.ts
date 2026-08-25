/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateView } from '@kbn/adaptive-ui';
import { investigationSpec, sampleInvestigation, toInvestigationViewSpec } from './investigation';

describe('toInvestigationViewSpec', () => {
  it('builds a valid ViewSpec from the fixture', () => {
    expect(validateView(investigationSpec)).toEqual(expect.objectContaining({ valid: true }));
  });

  it('uses the confirmed hypothesis as the title', () => {
    expect(investigationSpec.title).toBe(
      'payment-service v2.4.1 lowered the database connection pool ceiling'
    );
  });

  it('omits optional sections when their inputs are empty', () => {
    const spec = toInvestigationViewSpec({
      ...sampleInvestigation,
      conclusion: undefined,
      recommendations: [],
      blind_spots: [],
      hypotheses: [],
    });
    expect(validateView(spec)).toEqual(expect.objectContaining({ valid: true }));
    expect(spec.body.some((node) => node.type === 'panel')).toBe(false);
    expect(spec.body.some((node) => node.type === 'itemList')).toBe(false);
    expect(spec.body.some((node) => node.type === 'table')).toBe(false);
  });
});
