/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { convertKueryToElasticSearchQuery, escapeKuery } from '.';

describe('Kuery escape', () => {
  it('should not remove white spaces quotes', () => {
    const value = ' netcat';
    const expected = ' netcat';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape quotes', () => {
    const value = 'I said, "Hello."';
    const expected = 'I said, \\"Hello.\\"';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape special characters', () => {
    const value = `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`;
    const expected = `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`;
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape keywords', () => {
    const value = 'foo and bar or baz not qux';
    const expected = 'foo \\and bar \\or baz \\not qux';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape keywords next to each other', () => {
    const value = 'foo and bar or not baz';
    const expected = 'foo \\and bar \\or \\not baz';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should not escape keywords without surrounding spaces', () => {
    const value = 'And this has keywords, or does it not?';
    const expected = 'And this has keywords, \\or does it not?';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape uppercase keywords', () => {
    const value = 'foo AND bar';
    const expected = 'foo \\AND bar';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape both keywords and special characters', () => {
    const value = 'Hello, world, and <nice> to meet you!';
    const expected = 'Hello, world, \\and \\<nice\\> to meet you!';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape newlines and tabs', () => {
    const value = 'This\nhas\tnewlines\r\nwith\ttabs';
    const expected = 'This\\nhas\\tnewlines\\r\\nwith\\ttabs';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should return JSON that is not escaped for the final ES search', () => {
    const kueryExpression =
      '(host.name : siem-windows and event.action : "Registry value set \\(rule\\: RegistryEvent\\)") and @timestamp >= 1565274377369 and @timestamp <= 1565360777369';
    const expected =
      '{"bool":{"filter":[{"bool":{"filter":[{"bool":{"should":[{"match":{"host.name":"siem-windows"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"event.action":"Registry value set (rule: RegistryEvent)"}}],"minimum_should_match":1}}]}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1565274377369}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1565360777369}}}],"minimum_should_match":1}}]}}]}}';
    expect(
      convertKueryToElasticSearchQuery(kueryExpression, {
        fields: [],
        title: 'auditbeat-*,filebeat-*,packetbeat-*,winlogbeat-*',
      })
    ).to.be(expected);
  });
});
