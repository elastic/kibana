/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLiquidSyntaxError } from './liquid_syntax';

describe('getLiquidSyntaxError', () => {
  it('accepts a template that loops over the rows', () => {
    expect(
      getLiquidSyntaxError('<ul>{% for r in rows %}<li>{{ r["host"].value }}</li>{% endfor %}</ul>')
    ).toBeUndefined();
  });

  it('accepts plain HTML with no Liquid in it', () => {
    expect(getLiquidSyntaxError('<div>Hello</div>')).toBeUndefined();
  });

  it('reports a block that is not closed', () => {
    expect(getLiquidSyntaxError('<div>{% if true %}Hello</div>')).toContain('not closed');
  });

  it('reports an output tag that is not closed', () => {
    expect(getLiquidSyntaxError('<div>{{ row["host"].value </div>')).toBeDefined();
  });

  it.each([
    ['an output', '<p>{{ r.x | raw }}</p>'],
    ['after another filter', '<p>{{ r.x | upcase | raw }}</p>'],
    [
      'inside a loop and a condition',
      '{% for r in rows %}{% if r.a %}{{ r.x | raw }}{% endif %}{% endfor %}',
    ],
    ['in an assign', '{% assign z = q | raw %}{{ z }}'],
    ['in a capture', '{% capture c %}{{ w | raw }}{% endcapture %}{{ c }}'],
  ])('rejects the raw filter %s', (_, template) => {
    expect(getLiquidSyntaxError(template)).toContain('"raw" filter is not allowed');
  });

  it('does not mistake the word raw in text or a column name for the filter', () => {
    expect(getLiquidSyntaxError('<p>raw data | raw</p>{{ r["raw"].value }}')).toBeUndefined();
  });
});
