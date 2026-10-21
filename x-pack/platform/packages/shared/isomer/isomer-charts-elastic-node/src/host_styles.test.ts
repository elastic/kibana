/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiBodyFont, euiHostStyles, scopeCss } from './host_styles';

describe('euiHostStyles', () => {
  it('scopes every selector of a rule to the chart, keeping its specificity', () => {
    expect(
      scopeCss('/* c */ h1, p { margin: 0; }\n*:before { box-sizing: border-box; }', '.c')
    ).toBe(':where(.c) h1,:where(.c) p{margin: 0;}:where(.c) *:before{box-sizing: border-box;}');
  });

  it('gives charts EUI’s body font and Meyer reset, as Kibana’s page does', () => {
    expect(euiBodyFont()).toContain('font-size:14px');
    expect(euiBodyFont()).toContain(`line-height:${16 / 14}`);
    const css = euiHostStyles();
    expect(css).toContain(':where(.echChart) ol,:where(.echChart) ul{list-style: none;}');
    expect(css).toMatch(/:where\(\.echChart\) h1,[^{]*:where\(\.echChart\) p,[^{]*\{margin: 0;/);
    expect(css).not.toMatch(/(^|})\s*(html|body|ul|h1)\b/);
  });
});
