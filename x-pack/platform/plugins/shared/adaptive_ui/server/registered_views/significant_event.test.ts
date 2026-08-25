/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateView } from '@kbn/adaptive-ui';
import {
  buildSignificantEventSpec,
  significantEventFixture,
  significantEventSpec,
} from './significant_event';

describe('buildSignificantEventSpec', () => {
  it('builds a valid ViewSpec from the fixture', () => {
    expect(validateView(significantEventSpec)).toEqual(expect.objectContaining({ valid: true }));
  });

  it('renders the title and severity-derived subtitle', () => {
    expect(significantEventSpec.title).toBe(significantEventFixture.title);
    // criticality 92 -> "Critical".
    expect(significantEventSpec.subtitle).toContain('Critical');
  });

  it('omits optional sections when their inputs are empty', () => {
    const spec = buildSignificantEventSpec({
      ...significantEventFixture,
      evidences: [],
      cause_kis: [],
      recommendations: [],
      stream_names: [],
      rule_names: [],
    });
    expect(validateView(spec)).toEqual(expect.objectContaining({ valid: true }));
    expect(spec.body.some((node) => node.type === 'table')).toBe(false);
    expect(spec.body.some((node) => node.type === 'descriptionList')).toBe(false);
  });
});
