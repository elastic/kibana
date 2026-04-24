/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import { convertUriPartsProcessorToESQL } from './uri_parts';
import type { UriPartsProcessor } from '../../../../types/processors';

function commandsToString(commands: ESQLAstCommand[]): string {
  return BasicPrettyPrinter.print(Builder.expression.query(commands));
}

describe('convertUriPartsProcessorToESQL', () => {
  describe('default (no flags)', () => {
    it('emits a single URI_PARTS with default "url" prefix and guards against null source', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.request_url',
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(`attributes.request_url` IS NULL) | URI_PARTS url = `attributes.request_url` | EVAL `url.original` = CASE(NOT(`url.scheme` IS NULL) OR NOT(`url.domain` IS NULL) OR NOT(`url.fragment` IS NULL) OR NOT(`url.path` IS NULL) OR NOT(`url.query` IS NULL) OR NOT(`url.user_info` IS NULL) OR NOT(`url.username` IS NULL) OR NOT(`url.password` IS NULL) OR NOT(`url.extension` IS NULL) OR NOT(`url.port` IS NULL), `attributes.request_url`, NULL)'
      );
    });

    it('honors a custom target prefix', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(`attributes.href` IS NULL) | URI_PARTS `attributes.parsed` = `attributes.href` | EVAL `attributes.parsed.original` = CASE(NOT(`attributes.parsed.scheme` IS NULL) OR NOT(`attributes.parsed.domain` IS NULL) OR NOT(`attributes.parsed.fragment` IS NULL) OR NOT(`attributes.parsed.path` IS NULL) OR NOT(`attributes.parsed.query` IS NULL) OR NOT(`attributes.parsed.user_info` IS NULL) OR NOT(`attributes.parsed.username` IS NULL) OR NOT(`attributes.parsed.password` IS NULL) OR NOT(`attributes.parsed.extension` IS NULL) OR NOT(`attributes.parsed.port` IS NULL), `attributes.href`, NULL)'
      );
    });
  });

  describe('keep_original', () => {
    it('omits the `.original` EVAL when keep_original is false', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'url',
        keep_original: false,
      };
      // Also pins the canonical ECS in-place shape: `from === to === "url"`
      // (via the default target) emits `URI_PARTS url = url`, which ES|QL
      // accepts — the source column survives the command and sub-columns
      // `url.scheme, url.domain, ...` are added alongside it.
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(url IS NULL) | URI_PARTS url = url'
      );
    });

    it('accepts explicit `to === from` without collapsing or rewriting either column', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'url',
        to: 'url',
        keep_original: false,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(url IS NULL) | URI_PARTS url = url'
      );
    });

    it('keeps the source unchanged by assigning `<prefix>.original` when keep_original is true (default)', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'url',
        to: 'parts',
        keep_original: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(url IS NULL) | URI_PARTS parts = url | EVAL `parts.original` = CASE(NOT(`parts.scheme` IS NULL) OR NOT(`parts.domain` IS NULL) OR NOT(`parts.fragment` IS NULL) OR NOT(`parts.path` IS NULL) OR NOT(`parts.query` IS NULL) OR NOT(`parts.user_info` IS NULL) OR NOT(`parts.username` IS NULL) OR NOT(`parts.password` IS NULL) OR NOT(`parts.extension` IS NULL) OR NOT(`parts.port` IS NULL), url, NULL)'
      );
    });

    it('gates `<prefix>.original` on the parse success predicate so unparseable inputs do not silently populate it', () => {
      // Regression for the ingest-vs-ESQL divergence: with keep_original=true
      // and ignore_failure=true the ingest `uri_parts` processor writes NO
      // fields on unparseable input, including `<target_field>.original`.
      // ES|QL URI_PARTS emits a warning + null sub-fields on the same input,
      // so we must wrap the `.original` assignment in a CASE that keys off
      // the same OR-chain used by remove_if_successful.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        keep_original: true,
      };
      const query = commandsToString(convertUriPartsProcessorToESQL(processor));
      expect(query).toContain(
        'EVAL `url.original` = CASE(NOT(`url.scheme` IS NULL) OR NOT(`url.domain` IS NULL) OR NOT(`url.fragment` IS NULL) OR NOT(`url.path` IS NULL) OR NOT(`url.query` IS NULL) OR NOT(`url.user_info` IS NULL) OR NOT(`url.username` IS NULL) OR NOT(`url.password` IS NULL) OR NOT(`url.extension` IS NULL) OR NOT(`url.port` IS NULL), `attributes.href`, NULL)'
      );
    });
  });

  describe('ignore_missing', () => {
    it('drops the unconditional WHERE guard and gates URI_PARTS through a CASE when ignore_missing is true', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        ignore_missing: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"EVAL \`__temp_uri_parts_where_attributes.url__\` = CASE(NOT(\`attributes.url\` IS NULL), \`attributes.url\`, \\"\\") | URI_PARTS url = \`__temp_uri_parts_where_attributes.url__\` | DROP \`__temp_uri_parts_where_attributes.url__\` | EVAL \`url.original\` = CASE(NOT(\`attributes.url\` IS NULL) AND (NOT(\`url.scheme\` IS NULL) OR NOT(\`url.domain\` IS NULL) OR NOT(\`url.fragment\` IS NULL) OR NOT(\`url.path\` IS NULL) OR NOT(\`url.query\` IS NULL) OR NOT(\`url.user_info\` IS NULL) OR NOT(\`url.username\` IS NULL) OR NOT(\`url.password\` IS NULL) OR NOT(\`url.extension\` IS NULL) OR NOT(\`url.port\` IS NULL)), \`attributes.url\`, NULL)"`
      );
    });
  });

  describe('where condition', () => {
    it('gates URI_PARTS through a CASE expression on the where condition', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        where: { field: 'attributes.enabled', eq: true },
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"WHERE NOT(\`attributes.url\` IS NULL) | EVAL \`__temp_uri_parts_where_attributes.url__\` = CASE(\`attributes.enabled\` == TRUE, \`attributes.url\`, \\"\\") | URI_PARTS url = \`__temp_uri_parts_where_attributes.url__\` | DROP \`__temp_uri_parts_where_attributes.url__\` | EVAL \`url.original\` = CASE(\`attributes.enabled\` == TRUE AND (NOT(\`url.scheme\` IS NULL) OR NOT(\`url.domain\` IS NULL) OR NOT(\`url.fragment\` IS NULL) OR NOT(\`url.path\` IS NULL) OR NOT(\`url.query\` IS NULL) OR NOT(\`url.user_info\` IS NULL) OR NOT(\`url.username\` IS NULL) OR NOT(\`url.password\` IS NULL) OR NOT(\`url.extension\` IS NULL) OR NOT(\`url.port\` IS NULL)), \`attributes.url\`, NULL)"`
      );
    });

    it('emits the ignore_missing WHERE guard unconditionally so a where clause cannot leak null sources through', () => {
      // Regression: in an earlier revision the null-source WHERE guard was
      // hoisted inside the conditional branch, which meant `ignore_missing: false`
      // + `where` silently produced all-null parts for null inputs instead of
      // dropping them. This test pins the fix in dissect.ts/grok.ts parity.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        where: { field: 'attributes.enabled', eq: true },
      };
      const query = commandsToString(convertUriPartsProcessorToESQL(processor));
      expect(query.startsWith('WHERE NOT(`attributes.url` IS NULL)')).toBe(true);
    });

    it('combines ignore_missing and where predicates with AND inside the CASE', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        ignore_missing: true,
        where: { field: 'attributes.enabled', eq: true },
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"EVAL \`__temp_uri_parts_where_attributes.url__\` = CASE(NOT(\`attributes.url\` IS NULL) AND \`attributes.enabled\` == TRUE, \`attributes.url\`, \\"\\") | URI_PARTS url = \`__temp_uri_parts_where_attributes.url__\` | DROP \`__temp_uri_parts_where_attributes.url__\` | EVAL \`url.original\` = CASE(NOT(\`attributes.url\` IS NULL) AND \`attributes.enabled\` == TRUE AND (NOT(\`url.scheme\` IS NULL) OR NOT(\`url.domain\` IS NULL) OR NOT(\`url.fragment\` IS NULL) OR NOT(\`url.path\` IS NULL) OR NOT(\`url.query\` IS NULL) OR NOT(\`url.user_info\` IS NULL) OR NOT(\`url.username\` IS NULL) OR NOT(\`url.password\` IS NULL) OR NOT(\`url.extension\` IS NULL) OR NOT(\`url.port\` IS NULL)), \`attributes.url\`, NULL)"`
      );
    });
  });

  describe('remove_if_successful', () => {
    it('nulls the source field when any primary sub-field is populated (matches the csv-spec success signal)', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        remove_if_successful: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"WHERE NOT(\`attributes.url\` IS NULL) | URI_PARTS url = \`attributes.url\` | EVAL \`url.original\` = CASE(NOT(\`url.scheme\` IS NULL) OR NOT(\`url.domain\` IS NULL) OR NOT(\`url.fragment\` IS NULL) OR NOT(\`url.path\` IS NULL) OR NOT(\`url.query\` IS NULL) OR NOT(\`url.user_info\` IS NULL) OR NOT(\`url.username\` IS NULL) OR NOT(\`url.password\` IS NULL) OR NOT(\`url.extension\` IS NULL) OR NOT(\`url.port\` IS NULL), \`attributes.url\`, NULL) | EVAL \`attributes.url\` = CASE(NOT(\`url.scheme\` IS NULL) OR NOT(\`url.domain\` IS NULL) OR NOT(\`url.fragment\` IS NULL) OR NOT(\`url.path\` IS NULL) OR NOT(\`url.query\` IS NULL) OR NOT(\`url.user_info\` IS NULL) OR NOT(\`url.username\` IS NULL) OR NOT(\`url.password\` IS NULL) OR NOT(\`url.extension\` IS NULL) OR NOT(\`url.port\` IS NULL), NULL, \`attributes.url\`)"`
      );
    });

    it('ORs across every primary sub-field — relative URIs populate path/query without scheme so any single-column check would under-count successes', () => {
      // Sanity-check vs. the csv-spec (elasticsearch#140004): `testNoSchemeUri`
      // proves `scheme IS NOT NULL` alone is NOT a valid success signal.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'u',
        remove_if_successful: true,
      };
      const query = commandsToString(convertUriPartsProcessorToESQL(processor));
      for (const sub of [
        'scheme',
        'domain',
        'path',
        'query',
        'fragment',
        'user_info',
        'username',
        'password',
        'extension',
        'port',
      ]) {
        expect(query).toContain(`NOT(\`url.${sub}\` IS NULL)`);
      }
    });

    it('combines with a conditional path (keep_original + ignore_missing) without duplicating the source', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: false,
        remove_if_successful: true,
        ignore_missing: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"EVAL \`__temp_uri_parts_where_attributes.href__\` = CASE(NOT(\`attributes.href\` IS NULL), \`attributes.href\`, \\"\\") | URI_PARTS \`attributes.parsed\` = \`__temp_uri_parts_where_attributes.href__\` | DROP \`__temp_uri_parts_where_attributes.href__\` | EVAL \`attributes.href\` = CASE(NOT(\`attributes.parsed.scheme\` IS NULL) OR NOT(\`attributes.parsed.domain\` IS NULL) OR NOT(\`attributes.parsed.fragment\` IS NULL) OR NOT(\`attributes.parsed.path\` IS NULL) OR NOT(\`attributes.parsed.query\` IS NULL) OR NOT(\`attributes.parsed.user_info\` IS NULL) OR NOT(\`attributes.parsed.username\` IS NULL) OR NOT(\`attributes.parsed.password\` IS NULL) OR NOT(\`attributes.parsed.extension\` IS NULL) OR NOT(\`attributes.parsed.port\` IS NULL), NULL, \`attributes.href\`)"`
      );
    });
  });
});
