/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveContentTitle, stripSiteSuffix } from './content_title';

describe('stripSiteSuffix', () => {
  it('strips a spaced site-name suffix', () => {
    expect(stripSiteSuffix('Getting Started | Elastic Docs')).toBe('Getting Started');
  });

  it('preserves an unspaced pipe in a product name', () => {
    expect(stripSiteSuffix('ES|QL for security use cases')).toBe('ES|QL for security use cases');
  });

  it('strips the site suffix and keeps the product-name pipe', () => {
    expect(stripSiteSuffix('ES|QL rules | Elastic Security')).toBe('ES|QL rules');
  });
});

describe('resolveContentTitle', () => {
  it('restores a title cut at an unspaced pipe from the markdown heading', () => {
    expect(
      resolveContentTitle(
        'Use ES',
        '# Use ES|QL in the Kibana UI\nThe ES|QL editor lets you write queries.'
      )
    ).toBe('Use ES|QL in the Kibana UI');
  });

  it('strips a site suffix from a full HTML title', () => {
    expect(
      resolveContentTitle(
        'Use ES|QL in the Kibana UI | Elastic Docs',
        '# Use ES|QL in the Kibana UI\nBody'
      )
    ).toBe('Use ES|QL in the Kibana UI');
  });

  it('keeps the field title when the heading does not continue at a pipe', () => {
    expect(resolveContentTitle('Data streams overview', '# Data streams overview\nBody')).toBe(
      'Data streams overview'
    );
  });

  it('keeps the field title when the body has no heading', () => {
    expect(resolveContentTitle('ES|QL rules | Elastic Security', 'Just a paragraph.')).toBe(
      'ES|QL rules'
    );
  });

  it('reads a closed heading and a longer hash run', () => {
    expect(resolveContentTitle('Use ES', '## Use ES|QL in the Kibana UI ##\nBody')).toBe(
      'Use ES|QL in the Kibana UI'
    );
    expect(resolveContentTitle('Use ES', '####### Use ES|QL\nBody')).toBe('Use ES|QL');
  });

  it('restores a title from a heading after a non-heading line', () => {
    expect(resolveContentTitle('Use ES', 'Not a heading\n# Use ES|QL')).toBe('Use ES|QL');
  });
});
