/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CAI_VIEW_NAMES, CAI_VIEW_SURFACES, getCAIViewName } from './constants';

describe('getCAIViewName', () => {
  it.each([
    ['case', 'securitySolution', 'cases.case.securitysolution'],
    ['case', 'observability', 'cases.case.observability'],
    ['case', 'cases', 'cases.case.cases'],
    ['case_activity', 'securitySolution', 'cases.case_activity.securitysolution'],
    ['case_activity', 'observability', 'cases.case_activity.observability'],
    ['case_activity', 'cases', 'cases.case_activity.cases'],
    ['case_lifecycle', 'securitySolution', 'cases.case_lifecycle.securitysolution'],
    ['case_lifecycle', 'observability', 'cases.case_lifecycle.observability'],
    ['case_lifecycle', 'cases', 'cases.case_lifecycle.cases'],
  ])('combines surface %s + owner %s into %s (owner segment lowercased)', (surface, owner, expected) => {
    expect(getCAIViewName(surface as never, owner as never)).toBe(expected);
  });
});

describe('CAI_VIEW_NAMES / CAI_VIEW_SURFACES', () => {
  it('lists exactly 9 view names (3 surfaces × 3 owners) so the sync service has a single source of truth', () => {
    expect(CAI_VIEW_NAMES).toHaveLength(9);
    expect(new Set(CAI_VIEW_NAMES).size).toBe(9);
  });

  it('exposes the 3 logical surfaces by stable identifiers', () => {
    expect(CAI_VIEW_SURFACES).toEqual(['case', 'case_activity', 'case_lifecycle']);
  });
});
