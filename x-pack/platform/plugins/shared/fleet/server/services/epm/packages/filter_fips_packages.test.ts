/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterOutNonFipsPolicyTemplates,
  isPackageFipsIncompatible,
  FIPS_INCOMPATIBLE_PACKAGES,
} from './filter_fips_packages';

const makeTemplate = (name: string, fipsCompatible?: boolean) => ({
  name,
  title: name,
  description: '',
  fips_compatible: fipsCompatible,
});

const makePkg = (name: string, templates?: Array<ReturnType<typeof makeTemplate>>) =>
  ({ name, id: name, policy_templates: templates } as any);

describe('filterOutNonFipsPolicyTemplates', () => {
  it('keeps packages with no policy_templates', () => {
    const pkg = { name: 'no-templates', id: 'no-templates' } as any;
    expect(filterOutNonFipsPolicyTemplates([pkg])).toEqual([pkg]);
  });

  it('keeps packages with an empty policy_templates array', () => {
    const pkg = makePkg('empty', []);
    expect(filterOutNonFipsPolicyTemplates([pkg])).toEqual([pkg]);
  });

  it('keeps templates with fips_compatible: true', () => {
    const pkg = makePkg('pkg', [makeTemplate('t', true)]);
    const result = filterOutNonFipsPolicyTemplates([pkg]);
    expect(result).toHaveLength(1);
    expect(result[0].policy_templates).toHaveLength(1);
    expect(result[0].policy_templates[0].name).toBe('t');
  });

  it('keeps templates where fips_compatible is absent (missing = compatible)', () => {
    const pkg = makePkg('pkg', [makeTemplate('t', undefined)]);
    const result = filterOutNonFipsPolicyTemplates([pkg]);
    expect(result).toHaveLength(1);
    expect(result[0].policy_templates).toHaveLength(1);
  });

  it('removes templates with fips_compatible: false', () => {
    const pkg = makePkg('pkg', [makeTemplate('bad', false), makeTemplate('good', true)]);
    const result = filterOutNonFipsPolicyTemplates([pkg]);
    expect(result).toHaveLength(1);
    expect(result[0].policy_templates).toHaveLength(1);
    expect(result[0].policy_templates[0].name).toBe('good');
  });

  it('drops the entire package when all templates are fips_compatible: false', () => {
    const pkg = makePkg('pkg', [makeTemplate('a', false), makeTemplate('b', false)]);
    expect(filterOutNonFipsPolicyTemplates([pkg])).toHaveLength(0);
  });

  it('drops packages in the hardcoded FIPS_INCOMPATIBLE_PACKAGES denylist regardless of manifest flags', () => {
    const denylisted = makePkg('endpoint', [makeTemplate('t', true)]);
    expect(filterOutNonFipsPolicyTemplates([denylisted])).toHaveLength(0);
  });

  it('drops a denylisted package even when it has no policy_templates', () => {
    const denylisted = { name: 'endpoint', id: 'endpoint' } as any;
    expect(filterOutNonFipsPolicyTemplates([denylisted])).toHaveLength(0);
  });

  it('FIPS_INCOMPATIBLE_PACKAGES contains only endpoint', () => {
    expect([...FIPS_INCOMPATIBLE_PACKAGES]).toEqual(['endpoint']);
  });

  it('handles a mixed list: drops non-FIPS packages, keeps and trims partially-FIPS packages, keeps no-template packages', () => {
    const allBad = makePkg('all-bad', [makeTemplate('x', false)]);
    const mixed = makePkg('mixed', [makeTemplate('ok', undefined), makeTemplate('bad', false)]);
    const noTemplates = { name: 'bare', id: 'bare' } as any;

    const result = filterOutNonFipsPolicyTemplates([allBad, mixed, noTemplates]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('mixed');
    expect(result[0].policy_templates).toHaveLength(1);
    expect(result[0].policy_templates[0].name).toBe('ok');
    expect(result[1].name).toBe('bare');
  });
});

describe('isPackageFipsIncompatible', () => {
  it('returns false when there are no policy templates', () => {
    expect(isPackageFipsIncompatible(undefined)).toBe(false);
    expect(isPackageFipsIncompatible([])).toBe(false);
  });

  it('returns true when all templates are fips_compatible: false', () => {
    expect(isPackageFipsIncompatible([makeTemplate('a', false), makeTemplate('b', false)])).toBe(
      true
    );
  });

  it('returns false when at least one template is compatible or unflagged', () => {
    expect(isPackageFipsIncompatible([makeTemplate('a', false), makeTemplate('b', true)])).toBe(
      false
    );
    expect(
      isPackageFipsIncompatible([makeTemplate('a', false), makeTemplate('b', undefined)])
    ).toBe(false);
  });

  it('does not use the hardcoded catalogue denylist', () => {
    expect(FIPS_INCOMPATIBLE_PACKAGES.has('endpoint')).toBe(true);
    expect(isPackageFipsIncompatible([makeTemplate('t', undefined)])).toBe(false);
  });
});
