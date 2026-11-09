/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationLead } from './analyzer';
import { compareLeads } from './compare_leads';

const lead = (
  overrides: Partial<InvestigationLead> & Pick<InvestigationLead, 'id'>
): InvestigationLead => ({
  analyzerId: 'service_change_points',
  summary: overrides.id,
  relevance: 'Same service',
  ranking: { signal: 'weak', timing: 'during', relationship: 'service' },
  ...overrides,
});

describe('compareLeads', () => {
  it('ranks the same service above a dependency, and a change before the window above one after it', () => {
    const ranked = [
      lead({
        id: 'after',
        ranking: { signal: 'strong', timing: 'after', relationship: 'service' },
      }),
      lead({
        id: 'dependency',
        ranking: { signal: 'strong', timing: 'before', relationship: 'dependency' },
      }),
      lead({
        id: 'before',
        ranking: { signal: 'weak', timing: 'before', relationship: 'service' },
      }),
    ].sort(compareLeads);

    expect(ranked.map((item) => item.id)).toEqual(['before', 'after', 'dependency']);
  });

  it('uses signal strength only after relationship and timing agree', () => {
    const ranked = [
      lead({ id: 'weak', ranking: { signal: 'weak', timing: 'during', relationship: 'service' } }),
      lead({
        id: 'strong',
        ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
      }),
    ].sort(compareLeads);

    expect(ranked.map((item) => item.id)).toEqual(['strong', 'weak']);
  });
});
