/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import { parser as OsqueryParser } from './osquery_parser';

const parseOsqueryNodes = (value: string) =>
  unified()
    .use([[markdown, {}], OsqueryParser])
    .parse(value).children as Array<{ type: string; configuration?: Record<string, unknown> }>;

describe('osquery parser', () => {
  it('parses osquery token without configuration', () => {
    const nodes = parseOsqueryNodes('!{osquery}');
    const osqueryNode = nodes.find((node) => node.type === 'osquery');

    expect(osqueryNode).toMatchObject({ type: 'osquery', configuration: {} });
  });

  it('parses osquery token with configuration', () => {
    const nodes = parseOsqueryNodes('!{osquery{"query":"select 1;","ecs_mapping":{}}}');
    const osqueryNode = nodes.find((node) => node.type === 'osquery');

    expect(osqueryNode).toMatchObject({
      type: 'osquery',
      configuration: { query: 'select 1;', ecs_mapping: {} },
    });
  });

  it('throws when configuration is invalid JSON', () => {
    expect(() => parseOsqueryNodes('!{osquery{invalid-json}}')).toThrow(
      'Unable to parse osquery JSON configuration'
    );
  });
});
