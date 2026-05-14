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
    it('parses into the `__streamlang_uri_parts` temp prefix and merges into the default `url` target via COALESCE', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.request_url',
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(`attributes.request_url` IS NULL) | URI_PARTS __streamlang_uri_parts = `attributes.request_url` | EVAL `url.scheme` = COALESCE(`__streamlang_uri_parts.scheme`, `url.scheme`), `url.domain` = COALESCE(`__streamlang_uri_parts.domain`, `url.domain`), `url.fragment` = COALESCE(`__streamlang_uri_parts.fragment`, `url.fragment`), `url.path` = COALESCE(`__streamlang_uri_parts.path`, `url.path`), `url.query` = COALESCE(`__streamlang_uri_parts.query`, `url.query`), `url.user_info` = COALESCE(`__streamlang_uri_parts.user_info`, `url.user_info`), `url.username` = COALESCE(`__streamlang_uri_parts.username`, `url.username`), `url.password` = COALESCE(`__streamlang_uri_parts.password`, `url.password`), `url.extension` = COALESCE(`__streamlang_uri_parts.extension`, `url.extension`), `url.port` = COALESCE(`__streamlang_uri_parts.port`, `url.port`) | EVAL `url.original` = CASE(NOT(`__streamlang_uri_parts.scheme` IS NULL) OR NOT(`__streamlang_uri_parts.domain` IS NULL) OR NOT(`__streamlang_uri_parts.fragment` IS NULL) OR NOT(`__streamlang_uri_parts.path` IS NULL) OR NOT(`__streamlang_uri_parts.query` IS NULL) OR NOT(`__streamlang_uri_parts.user_info` IS NULL) OR NOT(`__streamlang_uri_parts.username` IS NULL) OR NOT(`__streamlang_uri_parts.password` IS NULL) OR NOT(`__streamlang_uri_parts.extension` IS NULL) OR NOT(`__streamlang_uri_parts.port` IS NULL), `attributes.request_url`, `url.original`) | DROP `__streamlang_uri_parts.scheme`, `__streamlang_uri_parts.domain`, `__streamlang_uri_parts.fragment`, `__streamlang_uri_parts.path`, `__streamlang_uri_parts.query`, `__streamlang_uri_parts.user_info`, `__streamlang_uri_parts.username`, `__streamlang_uri_parts.password`, `__streamlang_uri_parts.extension`, `__streamlang_uri_parts.port`'
      );
    });

    it('honors a custom target prefix in the COALESCE merge', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(`attributes.href` IS NULL) | URI_PARTS __streamlang_uri_parts = `attributes.href` | EVAL `attributes.parsed.scheme` = COALESCE(`__streamlang_uri_parts.scheme`, `attributes.parsed.scheme`), `attributes.parsed.domain` = COALESCE(`__streamlang_uri_parts.domain`, `attributes.parsed.domain`), `attributes.parsed.fragment` = COALESCE(`__streamlang_uri_parts.fragment`, `attributes.parsed.fragment`), `attributes.parsed.path` = COALESCE(`__streamlang_uri_parts.path`, `attributes.parsed.path`), `attributes.parsed.query` = COALESCE(`__streamlang_uri_parts.query`, `attributes.parsed.query`), `attributes.parsed.user_info` = COALESCE(`__streamlang_uri_parts.user_info`, `attributes.parsed.user_info`), `attributes.parsed.username` = COALESCE(`__streamlang_uri_parts.username`, `attributes.parsed.username`), `attributes.parsed.password` = COALESCE(`__streamlang_uri_parts.password`, `attributes.parsed.password`), `attributes.parsed.extension` = COALESCE(`__streamlang_uri_parts.extension`, `attributes.parsed.extension`), `attributes.parsed.port` = COALESCE(`__streamlang_uri_parts.port`, `attributes.parsed.port`) | EVAL `attributes.parsed.original` = CASE(NOT(`__streamlang_uri_parts.scheme` IS NULL) OR NOT(`__streamlang_uri_parts.domain` IS NULL) OR NOT(`__streamlang_uri_parts.fragment` IS NULL) OR NOT(`__streamlang_uri_parts.path` IS NULL) OR NOT(`__streamlang_uri_parts.query` IS NULL) OR NOT(`__streamlang_uri_parts.user_info` IS NULL) OR NOT(`__streamlang_uri_parts.username` IS NULL) OR NOT(`__streamlang_uri_parts.password` IS NULL) OR NOT(`__streamlang_uri_parts.extension` IS NULL) OR NOT(`__streamlang_uri_parts.port` IS NULL), `attributes.href`, `attributes.parsed.original`) | DROP `__streamlang_uri_parts.scheme`, `__streamlang_uri_parts.domain`, `__streamlang_uri_parts.fragment`, `__streamlang_uri_parts.path`, `__streamlang_uri_parts.query`, `__streamlang_uri_parts.user_info`, `__streamlang_uri_parts.username`, `__streamlang_uri_parts.password`, `__streamlang_uri_parts.extension`, `__streamlang_uri_parts.port`'
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
      // (via the default target) writes to the `__streamlang_uri_parts` temp
      // prefix, then merges its sub-fields into `url.*` via COALESCE without
      // touching the original `url` string column.
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(url IS NULL) | URI_PARTS __streamlang_uri_parts = url | EVAL `url.scheme` = COALESCE(`__streamlang_uri_parts.scheme`, `url.scheme`), `url.domain` = COALESCE(`__streamlang_uri_parts.domain`, `url.domain`), `url.fragment` = COALESCE(`__streamlang_uri_parts.fragment`, `url.fragment`), `url.path` = COALESCE(`__streamlang_uri_parts.path`, `url.path`), `url.query` = COALESCE(`__streamlang_uri_parts.query`, `url.query`), `url.user_info` = COALESCE(`__streamlang_uri_parts.user_info`, `url.user_info`), `url.username` = COALESCE(`__streamlang_uri_parts.username`, `url.username`), `url.password` = COALESCE(`__streamlang_uri_parts.password`, `url.password`), `url.extension` = COALESCE(`__streamlang_uri_parts.extension`, `url.extension`), `url.port` = COALESCE(`__streamlang_uri_parts.port`, `url.port`) | DROP `__streamlang_uri_parts.scheme`, `__streamlang_uri_parts.domain`, `__streamlang_uri_parts.fragment`, `__streamlang_uri_parts.path`, `__streamlang_uri_parts.query`, `__streamlang_uri_parts.user_info`, `__streamlang_uri_parts.username`, `__streamlang_uri_parts.password`, `__streamlang_uri_parts.extension`, `__streamlang_uri_parts.port`'
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
        'WHERE NOT(url IS NULL) | URI_PARTS __streamlang_uri_parts = url | EVAL `url.scheme` = COALESCE(`__streamlang_uri_parts.scheme`, `url.scheme`), `url.domain` = COALESCE(`__streamlang_uri_parts.domain`, `url.domain`), `url.fragment` = COALESCE(`__streamlang_uri_parts.fragment`, `url.fragment`), `url.path` = COALESCE(`__streamlang_uri_parts.path`, `url.path`), `url.query` = COALESCE(`__streamlang_uri_parts.query`, `url.query`), `url.user_info` = COALESCE(`__streamlang_uri_parts.user_info`, `url.user_info`), `url.username` = COALESCE(`__streamlang_uri_parts.username`, `url.username`), `url.password` = COALESCE(`__streamlang_uri_parts.password`, `url.password`), `url.extension` = COALESCE(`__streamlang_uri_parts.extension`, `url.extension`), `url.port` = COALESCE(`__streamlang_uri_parts.port`, `url.port`) | DROP `__streamlang_uri_parts.scheme`, `__streamlang_uri_parts.domain`, `__streamlang_uri_parts.fragment`, `__streamlang_uri_parts.path`, `__streamlang_uri_parts.query`, `__streamlang_uri_parts.user_info`, `__streamlang_uri_parts.username`, `__streamlang_uri_parts.password`, `__streamlang_uri_parts.extension`, `__streamlang_uri_parts.port`'
      );
    });

    it('writes `<prefix>.original` on parse success and preserves the prior value otherwise (keep_original default)', () => {
      // Regression for the ingest-vs-ESQL divergence: with keep_original=true
      // and ignore_failure=true the ingest `uri_parts` processor writes NO
      // fields on unparseable input, including `<target_field>.original`.
      // ES|QL URI_PARTS emits a warning + null sub-fields on the same input.
      // The CASE keys off the OR-chain over the **temp prefix** (not the
      // target), and the else-branch reads the existing `<prefix>.original`
      // so any pre-existing value is preserved — never destructively NULLed.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'url',
        to: 'parts',
        keep_original: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toBe(
        'WHERE NOT(url IS NULL) | URI_PARTS __streamlang_uri_parts = url | EVAL `parts.scheme` = COALESCE(`__streamlang_uri_parts.scheme`, `parts.scheme`), `parts.domain` = COALESCE(`__streamlang_uri_parts.domain`, `parts.domain`), `parts.fragment` = COALESCE(`__streamlang_uri_parts.fragment`, `parts.fragment`), `parts.path` = COALESCE(`__streamlang_uri_parts.path`, `parts.path`), `parts.query` = COALESCE(`__streamlang_uri_parts.query`, `parts.query`), `parts.user_info` = COALESCE(`__streamlang_uri_parts.user_info`, `parts.user_info`), `parts.username` = COALESCE(`__streamlang_uri_parts.username`, `parts.username`), `parts.password` = COALESCE(`__streamlang_uri_parts.password`, `parts.password`), `parts.extension` = COALESCE(`__streamlang_uri_parts.extension`, `parts.extension`), `parts.port` = COALESCE(`__streamlang_uri_parts.port`, `parts.port`) | EVAL `parts.original` = CASE(NOT(`__streamlang_uri_parts.scheme` IS NULL) OR NOT(`__streamlang_uri_parts.domain` IS NULL) OR NOT(`__streamlang_uri_parts.fragment` IS NULL) OR NOT(`__streamlang_uri_parts.path` IS NULL) OR NOT(`__streamlang_uri_parts.query` IS NULL) OR NOT(`__streamlang_uri_parts.user_info` IS NULL) OR NOT(`__streamlang_uri_parts.username` IS NULL) OR NOT(`__streamlang_uri_parts.password` IS NULL) OR NOT(`__streamlang_uri_parts.extension` IS NULL) OR NOT(`__streamlang_uri_parts.port` IS NULL), url, `parts.original`) | DROP `__streamlang_uri_parts.scheme`, `__streamlang_uri_parts.domain`, `__streamlang_uri_parts.fragment`, `__streamlang_uri_parts.path`, `__streamlang_uri_parts.query`, `__streamlang_uri_parts.user_info`, `__streamlang_uri_parts.username`, `__streamlang_uri_parts.password`, `__streamlang_uri_parts.extension`, `__streamlang_uri_parts.port`'
      );
    });

    it('keys the `<prefix>.original` success predicate off the temp prefix (not the target) so it reflects "this invocation parsed" rather than "any value is non-null in <to>.*"', () => {
      // Without this, a pre-existing `url.scheme` would falsely register as
      // a successful parse and overwrite `url.original` even on rows where
      // the current invocation parsed nothing.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        keep_original: true,
      };
      const query = commandsToString(convertUriPartsProcessorToESQL(processor));
      expect(query).toContain(
        'EVAL `url.original` = CASE(NOT(`__streamlang_uri_parts.scheme` IS NULL) OR NOT(`__streamlang_uri_parts.domain` IS NULL) OR NOT(`__streamlang_uri_parts.fragment` IS NULL) OR NOT(`__streamlang_uri_parts.path` IS NULL) OR NOT(`__streamlang_uri_parts.query` IS NULL) OR NOT(`__streamlang_uri_parts.user_info` IS NULL) OR NOT(`__streamlang_uri_parts.username` IS NULL) OR NOT(`__streamlang_uri_parts.password` IS NULL) OR NOT(`__streamlang_uri_parts.extension` IS NULL) OR NOT(`__streamlang_uri_parts.port` IS NULL), `attributes.href`, `url.original`)'
      );
    });
  });

  describe('ignore_missing', () => {
    it('drops the unconditional WHERE pre-filter when ignore_missing is true; the COALESCE merge alone preserves prior <to>.* values on null sources', () => {
      // Behavior shift vs. earlier revisions: ignore_missing=true no longer
      // forces an input-side CASE gate. URI_PARTS receives the (possibly
      // null) source directly, produces all-null temp outputs on null
      // inputs, and the COALESCE merge falls back to whatever was already
      // in `<to>.*`. Net: null sources don't destructively null `<to>.*`.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        ignore_missing: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"URI_PARTS __streamlang_uri_parts = \`attributes.url\` | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`), \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, \`url.port\`) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
      );
    });
  });

  describe('where condition', () => {
    it('gates the input through `EVAL __streamlang_uri_parts_expression = CASE(<where>, <from>, "")` and parses into the temp prefix', () => {
      // The CASE-on-input pattern makes URI_PARTS short-circuit on rows
      // failing the condition (empty-string input → all-null temp output),
      // and the downstream COALESCE merge then preserves whatever `<to>.*`
      // already held — fixing the historical "where:false silently nulls
      // pre-existing target fields" destructive overwrite gap.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        where: { field: 'attributes.enabled', eq: true },
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"WHERE NOT(\`attributes.url\` IS NULL) | EVAL __streamlang_uri_parts_expression = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE), \`attributes.url\`, \\"\\") | URI_PARTS __streamlang_uri_parts = __streamlang_uri_parts_expression | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`), \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, \`url.port\`) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`, __streamlang_uri_parts_expression"`
      );
    });

    it('emits the ignore_missing WHERE pre-filter so a where clause cannot leak null sources past it', () => {
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

    it('when ignore_missing AND where are both set, drops the pre-filter and uses `where` alone in the input CASE', () => {
      // ignore_missing=true skips the pre-filter; the where clause alone
      // gates URI_PARTS via the temp-input column. Rows with null source
      // produce a null temp output, COALESCE preserves prior `<to>.*`.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        ignore_missing: true,
        where: { field: 'attributes.enabled', eq: true },
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"EVAL __streamlang_uri_parts_expression = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE), \`attributes.url\`, \\"\\") | URI_PARTS __streamlang_uri_parts = __streamlang_uri_parts_expression | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`), \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, \`url.port\`) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`, __streamlang_uri_parts_expression"`
      );
    });
  });

  describe('remove_if_successful', () => {
    it('nulls the source field only when the temp parse populated any primary sub-field (matches the csv-spec success signal)', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.url',
        remove_if_successful: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"WHERE NOT(\`attributes.url\` IS NULL) | URI_PARTS __streamlang_uri_parts = \`attributes.url\` | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`), \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, \`url.port\`) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | EVAL \`attributes.url\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), NULL, \`attributes.url\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
      );
    });

    it('ORs the success predicate across every primary sub-field of the temp prefix — relative URIs populate path/query without scheme so any single-column check would under-count successes', () => {
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
        expect(query).toContain(`NOT(\`__streamlang_uri_parts.${sub}\` IS NULL)`);
      }
    });

    it('combines with a conditional path (keep_original=false + ignore_missing) without duplicating the source', () => {
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: false,
        remove_if_successful: true,
        ignore_missing: true,
      };
      expect(commandsToString(convertUriPartsProcessorToESQL(processor))).toMatchInlineSnapshot(
        `"URI_PARTS __streamlang_uri_parts = \`attributes.href\` | EVAL \`attributes.parsed.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`attributes.parsed.scheme\`), \`attributes.parsed.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`attributes.parsed.domain\`), \`attributes.parsed.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`attributes.parsed.fragment\`), \`attributes.parsed.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`attributes.parsed.path\`), \`attributes.parsed.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`attributes.parsed.query\`), \`attributes.parsed.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`attributes.parsed.user_info\`), \`attributes.parsed.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`attributes.parsed.username\`), \`attributes.parsed.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`attributes.parsed.password\`), \`attributes.parsed.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`attributes.parsed.extension\`), \`attributes.parsed.port\` = COALESCE(\`__streamlang_uri_parts.port\`, \`attributes.parsed.port\`) | EVAL \`attributes.href\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), NULL, \`attributes.href\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
      );
    });
  });

  describe('non-destructive merge (closes the conditional-overwrite gap)', () => {
    it('always reads the merge fallback off the target prefix so where:false rows preserve any prior <to>.* values', () => {
      // Destruction-fix invariant: every COALESCE in the merge step must
      // have the temp column first and the existing target column second.
      // If a future refactor swapped the args or replaced the fallback with
      // NULL, the conditional path would silently null pre-existing data on
      // rows where the parse short-circuited.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: false,
        where: { field: 'attributes.enabled', eq: true },
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
        expect(query).toContain(
          `\`attributes.parsed.${sub}\` = COALESCE(\`__streamlang_uri_parts.${sub}\`, \`attributes.parsed.${sub}\`)`
        );
      }
    });

    it('drops every temp column it introduces — sub-fields and the input expression', () => {
      // Without the DROP, downstream commands would see leaked
      // `__streamlang_uri_parts.*` and `__streamlang_uri_parts_expression`
      // columns and dashboards built off `documentsWithoutKeywords` would
      // surface them as user-visible fields.
      const processor: UriPartsProcessor = {
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: false,
        where: { field: 'attributes.enabled', eq: true },
      };
      const query = commandsToString(convertUriPartsProcessorToESQL(processor));
      const dropClause = query.split(' | ').find((segment) => segment.startsWith('DROP '));
      expect(dropClause).toBeDefined();
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
        expect(dropClause).toContain(`\`__streamlang_uri_parts.${sub}\``);
      }
      expect(dropClause).toContain('__streamlang_uri_parts_expression');
    });
  });
});
