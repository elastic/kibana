/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { escapeQuotes, escapeKuery } from '../escape_kuery';

describe('Kuery escape', function () {
  it('should escape quotes', function () {
    const value = 'I said, "Hello."';
    const expected = 'I said, \\"Hello.\\"';
    expect(escapeQuotes(value)).to.be(expected);
  });

  it('should escape special characters', function () {
    const value = `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`;
    const expected = `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`;
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape keywords', function () {
    const value = 'foo and bar or baz not qux';
    const expected = 'foo \\and bar \\or baz \\not qux';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape keywords next to each other', function () {
    const value = 'foo and bar or not baz';
    const expected = 'foo \\and bar \\or \\not baz';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should not escape keywords without surrounding spaces', function () {
    const value = 'And this has keywords, or does it not?';
    const expected = 'And this has keywords, \\or does it not?';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape uppercase keywords', function () {
    const value = 'foo AND bar';
    const expected = 'foo \\AND bar';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape both keywords and special characters', function () {
    const value = 'Hello, world, and <nice> to meet you!';
    const expected = 'Hello, world, \\and \\<nice\\> to meet you!';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape newlines and tabs', () => {
    const value = 'This\nhas\tnewlines\r\nwith\ttabs';
    const expected = 'This\\nhas\\tnewlines\\r\\nwith\\ttabs';
    expect(escapeKuery(value)).to.be(expected);
  });
});
