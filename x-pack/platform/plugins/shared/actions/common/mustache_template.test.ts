/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasMustacheTemplate, withoutMustacheTemplate } from './mustache_template';

const nonMustacheEmails = ['', 'zero@a.b.c', '}}{{'];
const mustacheEmails = ['{{}}', '"bob" {{}}@elastic.co', 'sneaky{{\n}}pete'];

describe('mustache_template', () => {
  it('hasMustacheTemplate', () => {
    for (const email of nonMustacheEmails) {
      expect(hasMustacheTemplate(email)).toBe(false);
    }
    for (const email of mustacheEmails) {
      expect(hasMustacheTemplate(email)).toBe(true);
    }
  });

  it('withoutMustacheTemplate', () => {
    let result = withoutMustacheTemplate(nonMustacheEmails);
    expect(result).toEqual(nonMustacheEmails);

    result = withoutMustacheTemplate(mustacheEmails);
    expect(result).toEqual([]);

    result = withoutMustacheTemplate(mustacheEmails.concat(nonMustacheEmails));
    expect(result).toEqual(nonMustacheEmails);
  });
});
