/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyRepository } from './classify_repository';

describe('classifyRepository', () => {
  it('classifies a programming-language-only repo as app', () => {
    const result = classifyRepository([
      { language: 'go', count: 120 },
      { language: 'yaml', count: 5 },
    ]);
    expect(result.repoType).toBe('app');
    expect(result.isApp).toBe(true);
    expect(result.isIac).toBe(false);
    expect(result.primaryLanguage).toBe('go');
  });

  it('classifies a Terraform-only repo as iac with no primary language', () => {
    const result = classifyRepository([
      { language: 'hcl', count: 80 },
      { language: 'markdown', count: 10 },
    ]);
    expect(result.repoType).toBe('iac');
    expect(result.isApp).toBe(false);
    expect(result.isIac).toBe(true);
    expect(result.primaryLanguage).toBeUndefined();
  });

  it('classifies a mixed repo as both', () => {
    const result = classifyRepository([
      { language: 'terraform', count: 40 },
      { language: 'python', count: 200 },
      { language: 'typescript', count: 50 },
    ]);
    expect(result.repoType).toBe('both');
    expect(result.isApp).toBe(true);
    expect(result.isIac).toBe(true);
    expect(result.primaryLanguage).toBe('python');
  });

  it('normalizes casing/whitespace and ignores empty language keys', () => {
    const result = classifyRepository([
      { language: '  Go  ', count: 10 },
      { language: '', count: 999 },
    ]);
    expect(result.primaryLanguage).toBe('go');
    expect(result.languages).toEqual([{ language: 'go', count: 10 }]);
  });

  it('defaults an empty histogram to app with no primary language', () => {
    const result = classifyRepository([]);
    expect(result.repoType).toBe('app');
    expect(result.isApp).toBe(false);
    expect(result.primaryLanguage).toBeUndefined();
  });

  it('classifies as both when app languages coexist with IaC file signals (no IaC language)', () => {
    const result = classifyRepository(
      [
        { language: 'typescript', count: 100 },
        { language: 'yaml', count: 30 },
      ],
      [{ kind: 'kubernetes', path: 'kubernetes/deployment.yaml' }]
    );
    expect(result.repoType).toBe('both');
    expect(result.isApp).toBe(true);
    expect(result.isIac).toBe(true);
    expect(result.primaryLanguage).toBe('typescript');
    expect(result.iacSignals).toEqual([{ kind: 'kubernetes', path: 'kubernetes/deployment.yaml' }]);
  });

  it('classifies as iac from file signals alone when there are no app languages', () => {
    const result = classifyRepository(
      [{ language: 'markdown', count: 10 }],
      [{ kind: 'helm', path: 'chart/Chart.yaml' }]
    );
    expect(result.repoType).toBe('iac');
    expect(result.isApp).toBe(false);
    expect(result.isIac).toBe(true);
  });

  it('defaults iacSignals to an empty array when omitted', () => {
    const result = classifyRepository([{ language: 'go', count: 10 }]);
    expect(result.iacSignals).toEqual([]);
  });
});
