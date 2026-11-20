/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRuleMatch } from '../../../common/types';
import { matchTargets } from './target_matches';

const targets: BoostRuleMatch[] = [
  { name: 'archive-2024', isHidden: false },
  { name: 'catalog-2026-fall', isHidden: false },
  { name: 'products', isHidden: false },
  { name: '.internal-alerts', isHidden: true },
];

const matchOf = (pattern: string) =>
  Object.fromEntries(matchTargets(pattern, targets).map(({ name, match }) => [name, match]));

describe('matchTargets', () => {
  it('leaves every target unmatched before anything is typed', () => {
    expect(matchTargets('', targets).map(({ match }) => match)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('matches a name exactly', () => {
    expect(matchOf('products')).toEqual({
      'archive-2024': undefined,
      'catalog-2026-fall': undefined,
      products: 'exact',
      '.internal-alerts': undefined,
    });
  });

  it('matches a wildcard pattern exactly, and names containing it partially', () => {
    expect(matchOf('a*')).toEqual({
      'archive-2024': 'exact',
      'catalog-2026-fall': 'partial',
      products: undefined,
      '.internal-alerts': 'partial',
    });
  });

  it('matches names that contain what was typed partially', () => {
    expect(matchOf('catalog')).toMatchObject({ 'catalog-2026-fall': 'partial' });
    expect(matchOf('2026')).toMatchObject({ 'catalog-2026-fall': 'partial' });
  });

  it('matches every target exactly with a match-all pattern', () => {
    expect(Object.values(matchOf('*'))).toEqual(['exact', 'exact', 'exact', 'exact']);
  });

  it('treats regular expression characters literally', () => {
    expect(matchOf('.internal-alerts')).toMatchObject({ '.internal-alerts': 'exact' });
    expect(matchOf('.')).toMatchObject({
      'archive-2024': undefined,
      '.internal-alerts': 'partial',
    });
  });

  it('splits the name into what was typed and the rest', () => {
    const [archive, catalog] = matchTargets('catalog', targets).slice(0, 2);
    expect(archive.nameParts).toEqual([{ text: 'archive-2024', isTyped: false }]);
    expect(catalog.nameParts).toEqual([
      { text: 'catalog', isTyped: true },
      { text: '-2026-fall', isTyped: false },
    ]);

    const [, wildcard] = matchTargets('catalog-*-fall', targets);
    expect(wildcard.nameParts).toEqual([
      { text: 'catalog-', isTyped: true },
      { text: '2026', isTyped: false },
      { text: '-fall', isTyped: true },
    ]);
  });

  it('keeps the rest of each target', () => {
    const [outranked] = matchTargets('archive-*', [
      { name: 'archive-2024', isHidden: false, outrankedByRuleName: 'archives' },
    ]);
    expect(outranked).toMatchObject({ match: 'exact', outrankedByRuleName: 'archives' });
  });
});
