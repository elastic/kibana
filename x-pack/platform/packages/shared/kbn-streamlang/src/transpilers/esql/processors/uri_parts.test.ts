/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import { isColumn, isFunctionExpression, isLiteral } from '@elastic/esql';
import { convertUriPartsProcessorToESQL } from './uri_parts';
import type { UriPartsProcessor } from '../../../../types/processors';
import {
  URI_PARTS_NUMBER_SUBFIELDS,
  URI_PARTS_STRING_SUBFIELDS,
} from '../../../../types/processors/uri_parts';

function commandsToString(commands: ESQLAstCommand[]): string {
  return BasicPrettyPrinter.print(Builder.expression.query(commands));
}

/**
 * Strip the backticks the AST builder wraps around dotted column names so the
 * structural assertions below can match raw identifiers like `url.port`
 * without depending on quoting conventions.
 */
function getColumnName(node: ESQLAstItem): string | undefined {
  return isColumn(node) ? node.name.replace(/^`|`$/g, '') : undefined;
}

/**
 * Walk every `EVAL <target> = <expr>` assignment in `commands` and return the
 * RHS expression assigned to `targetName`. Returns undefined if no assignment
 * is found (the calling test will assert on that, rather than crashing here).
 *
 * Used by the destruction-fix tests to inspect the *structure* of each merge
 * COALESCE rather than the string it pretty-prints to — that way assertions
 * are robust to whitespace, ordering of EVAL clauses, and future formatting
 * changes in the pretty printer.
 */
function findEvalAssignmentRhs(
  commands: ESQLAstCommand[],
  targetName: string
): ESQLAstItem | undefined {
  for (const command of commands) {
    if (command.name !== 'eval') continue;
    for (const arg of command.args) {
      if (!isFunctionExpression(arg) || arg.name !== '=') continue;
      const [lhs, rhs] = arg.args;
      if (getColumnName(lhs) === targetName) return rhs;
    }
  }
  return undefined;
}

describe('convertUriPartsProcessorToESQL', () => {
  describe('keep_original', () => {
    it('omits the `<to>.original` EVAL entirely when keep_original is false', () => {
      // The only invariant that can't be inferred from the other tests in
      // this file: no EVAL assigns to `<to>.original` when keep_original is
      // false. Asserted structurally so the test doesn't depend on the full
      // emitted query shape (covered by the structural merge / drop tests
      // and the comprehensive transpiler snapshot).
      const commands = convertUriPartsProcessorToESQL({
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: false,
      });
      expect(findEvalAssignmentRhs(commands, 'attributes.parsed.original')).toBeUndefined();
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
        `"URI_PARTS __streamlang_uri_parts = \`attributes.url\` | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`) | EVAL \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, TO_INTEGER(\`url.port\`)) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
      );
    });
  });

  describe('where condition', () => {
    it('gates the input through `EVAL __streamlang_uri_parts_expression = CASE(<where>, <from>, NULL)` and parses into the temp prefix', () => {
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
        `"WHERE NOT(\`attributes.url\` IS NULL) | EVAL __streamlang_uri_parts_expression = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE), \`attributes.url\`, NULL) | URI_PARTS __streamlang_uri_parts = __streamlang_uri_parts_expression | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`) | EVAL \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, TO_INTEGER(\`url.port\`)) | EVAL \`url.original\` = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE) AND (NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL)), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`, __streamlang_uri_parts_expression"`
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
        `"EVAL __streamlang_uri_parts_expression = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE), \`attributes.url\`, NULL) | URI_PARTS __streamlang_uri_parts = __streamlang_uri_parts_expression | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`) | EVAL \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, TO_INTEGER(\`url.port\`)) | EVAL \`url.original\` = CASE(COALESCE(\`attributes.enabled\` == TRUE, FALSE) AND (NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL)), \`attributes.url\`, \`url.original\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`, __streamlang_uri_parts_expression"`
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
        `"WHERE NOT(\`attributes.url\` IS NULL) | URI_PARTS __streamlang_uri_parts = \`attributes.url\` | EVAL \`url.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`url.scheme\`), \`url.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`url.domain\`), \`url.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`url.fragment\`), \`url.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`url.path\`), \`url.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`url.query\`), \`url.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`url.user_info\`), \`url.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`url.username\`), \`url.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`url.password\`), \`url.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`url.extension\`) | EVAL \`url.port\` = COALESCE(\`__streamlang_uri_parts.port\`, TO_INTEGER(\`url.port\`)) | EVAL \`url.original\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), \`attributes.url\`, \`url.original\`) | EVAL \`attributes.url\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), NULL, \`attributes.url\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
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
        `"URI_PARTS __streamlang_uri_parts = \`attributes.href\` | EVAL \`attributes.parsed.scheme\` = COALESCE(\`__streamlang_uri_parts.scheme\`, \`attributes.parsed.scheme\`), \`attributes.parsed.domain\` = COALESCE(\`__streamlang_uri_parts.domain\`, \`attributes.parsed.domain\`), \`attributes.parsed.fragment\` = COALESCE(\`__streamlang_uri_parts.fragment\`, \`attributes.parsed.fragment\`), \`attributes.parsed.path\` = COALESCE(\`__streamlang_uri_parts.path\`, \`attributes.parsed.path\`), \`attributes.parsed.query\` = COALESCE(\`__streamlang_uri_parts.query\`, \`attributes.parsed.query\`), \`attributes.parsed.user_info\` = COALESCE(\`__streamlang_uri_parts.user_info\`, \`attributes.parsed.user_info\`), \`attributes.parsed.username\` = COALESCE(\`__streamlang_uri_parts.username\`, \`attributes.parsed.username\`), \`attributes.parsed.password\` = COALESCE(\`__streamlang_uri_parts.password\`, \`attributes.parsed.password\`), \`attributes.parsed.extension\` = COALESCE(\`__streamlang_uri_parts.extension\`, \`attributes.parsed.extension\`) | EVAL \`attributes.parsed.port\` = COALESCE(\`__streamlang_uri_parts.port\`, TO_INTEGER(\`attributes.parsed.port\`)) | EVAL \`attributes.href\` = CASE(NOT(\`__streamlang_uri_parts.scheme\` IS NULL) OR NOT(\`__streamlang_uri_parts.domain\` IS NULL) OR NOT(\`__streamlang_uri_parts.fragment\` IS NULL) OR NOT(\`__streamlang_uri_parts.path\` IS NULL) OR NOT(\`__streamlang_uri_parts.query\` IS NULL) OR NOT(\`__streamlang_uri_parts.user_info\` IS NULL) OR NOT(\`__streamlang_uri_parts.username\` IS NULL) OR NOT(\`__streamlang_uri_parts.password\` IS NULL) OR NOT(\`__streamlang_uri_parts.extension\` IS NULL) OR NOT(\`__streamlang_uri_parts.port\` IS NULL), NULL, \`attributes.href\`) | DROP \`__streamlang_uri_parts.scheme\`, \`__streamlang_uri_parts.domain\`, \`__streamlang_uri_parts.fragment\`, \`__streamlang_uri_parts.path\`, \`__streamlang_uri_parts.query\`, \`__streamlang_uri_parts.user_info\`, \`__streamlang_uri_parts.username\`, \`__streamlang_uri_parts.password\`, \`__streamlang_uri_parts.extension\`, \`__streamlang_uri_parts.port\`"`
      );
    });
  });

  describe('non-destructive merge (closes the conditional-overwrite gap)', () => {
    it('merges every URI_PARTS sub-field via COALESCE(temp, target) so where:false rows preserve any prior <to>.* values', () => {
      // Destruction-fix invariant. Asserted structurally on the AST rather
      // than by substring match so the test is robust to pretty-printer
      // changes and scales automatically when new sub-fields are added to
      // URI_PARTS_STRING_SUBFIELDS / URI_PARTS_NUMBER_SUBFIELDS.
      //
      // For every sub-field the merge must:
      //   1. Be a COALESCE call (not a plain assignment, which would null the
      //      target on a failed parse).
      //   2. Have the temp column as the FIRST arg, so a successful parse
      //      wins.
      //   3. Use the EXISTING target column as the fallback (not NULL),
      //      preserving prior values on where:false or unparseable rows.
      // For numeric sub-fields the fallback must additionally be wrapped in
      // TO_INTEGER on the target side so a `long`-mapped column doesn't
      // trigger a verification_exception in ES|QL (integer↔long is not
      // auto-promoted inside COALESCE).
      const to = 'attributes.parsed';
      const tempPrefix = '__streamlang_uri_parts';
      const commands = convertUriPartsProcessorToESQL({
        action: 'uri_parts',
        from: 'attributes.href',
        to,
        keep_original: false,
        where: { field: 'attributes.enabled', eq: true },
      });

      for (const field of URI_PARTS_STRING_SUBFIELDS) {
        const target = `${to}.${field}`;
        const rhs = findEvalAssignmentRhs(commands, target);
        expect(isFunctionExpression(rhs) && rhs.name === 'COALESCE').toBe(true);
        const coalesce = rhs as Extract<ESQLAstItem, { type: 'function' }>;
        expect(getColumnName(coalesce.args[0])).toBe(`${tempPrefix}.${field}`);
        expect(getColumnName(coalesce.args[1])).toBe(target);
      }

      for (const field of URI_PARTS_NUMBER_SUBFIELDS) {
        const target = `${to}.${field}`;
        const rhs = findEvalAssignmentRhs(commands, target);
        expect(isFunctionExpression(rhs) && rhs.name === 'COALESCE').toBe(true);
        const coalesce = rhs as Extract<ESQLAstItem, { type: 'function' }>;
        expect(getColumnName(coalesce.args[0])).toBe(`${tempPrefix}.${field}`);
        // Fallback is TO_INTEGER(target), not target directly — locks the
        // type-coercion fix that closes the verification_exception path.
        const fallback = coalesce.args[1];
        expect(isFunctionExpression(fallback) && fallback.name === 'TO_INTEGER').toBe(true);
        const cast = fallback as Extract<ESQLAstItem, { type: 'function' }>;
        expect(getColumnName(cast.args[0])).toBe(target);
      }
    });

    it("AND-s the keep_original / remove_if_successful success predicate with `where` so URI_PARTS' empty-input output cannot mark gated rows as parsed", () => {
      // Regression net for the cross-compat failure where a where:false row
      // saw its `<to>.original` overwritten with the row's `<from>`. Root
      // cause: the conditional input gate writes "" for gated rows, and
      // URI_PARTS emits `path = ""` (non-null) for an empty input — so a
      // sub-field-only success predicate evaluates TRUE on every gated row
      // and the keep_original CASE fires when it shouldn't.
      //
      // The fix: the success predicate must AND the OR-of-temp-non-null
      // half with the user's `where` condition, so gated rows are
      // categorically non-successes regardless of URI_PARTS' output.
      const where = { field: 'attributes.enabled', eq: true } as const;
      const to = 'attributes.parsed';
      const commands = convertUriPartsProcessorToESQL({
        action: 'uri_parts',
        from: 'attributes.href',
        to,
        keep_original: true,
        remove_if_successful: true,
        where,
      });

      // Both `<to>.original` (keep_original) and `<from>` (remove_if_successful)
      // assignments use a `CASE(<success>, ..., ...)` predicate. Walk both
      // and assert the top-level predicate is an AND whose first arg is the
      // user's `where` expression and second arg is the OR-of-temp-non-null
      // success expression. Anything else (e.g. just the OR, or the AND
      // with sides swapped) lets URI_PARTS' empty-string sentinel leak
      // through.
      const guardedTargets = [`${to}.original`, 'attributes.href'];
      for (const target of guardedTargets) {
        const rhs = findEvalAssignmentRhs(commands, target);
        expect(isFunctionExpression(rhs) && rhs.name === 'CASE').toBe(true);
        const caseExpr = rhs as Extract<ESQLAstItem, { type: 'function' }>;
        const predicate = caseExpr.args[0];
        expect(isFunctionExpression(predicate) && predicate.name === 'and').toBe(true);
        const andExpr = predicate as Extract<ESQLAstItem, { type: 'function' }>;
        // First arg of AND is the user's `where` condition. `attributes.enabled
        // == TRUE` is rendered by `conditionToESQLAst` as a COALESCE around the
        // `==` to preserve null-safe semantics — we don't pin the exact shape
        // here, only that it references the `where` field. The OR-of-temp half
        // never references `attributes.enabled`, so that's enough to tell them
        // apart.
        const whereText = JSON.stringify(andExpr.args[0]);
        expect(whereText).toContain('attributes.enabled');
        expect(whereText).not.toContain('__streamlang_uri_parts');
        // Second arg is the OR-of-temp-non-null success expression — it must
        // mention the temp prefix and must not mention the where field.
        const successText = JSON.stringify(andExpr.args[1]);
        expect(successText).toContain('__streamlang_uri_parts');
        expect(successText).not.toContain('attributes.enabled');
      }
    });

    it('omits the where AND-gate from the success predicate when no `where` is set (no spurious extra clause)', () => {
      // Symmetric to the gated test: when the processor is unconditional,
      // the success predicate must NOT be wrapped in an AND with anything,
      // otherwise a partial parse on an unconditional row would be
      // mis-classified as "row gated out".
      const commands = convertUriPartsProcessorToESQL({
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        keep_original: true,
      });
      const rhs = findEvalAssignmentRhs(commands, 'attributes.parsed.original');
      expect(isFunctionExpression(rhs) && rhs.name === 'CASE').toBe(true);
      const caseExpr = rhs as Extract<ESQLAstItem, { type: 'function' }>;
      const predicate = caseExpr.args[0];
      // The top-level node is the OR-of-temp-non-null, not an AND.
      expect(isFunctionExpression(predicate) && predicate.name === 'or').toBe(true);
    });

    it('gates the URI_PARTS input with NULL (not "") on where:false rows so the merge step preserves prior <to>.* values for every sub-field', () => {
      // Regression net for the suspected residual destruction gap: URI_PARTS
      // emits `path = ""` (non-null) for empty-string input, which would
      // otherwise leak through the COALESCE merge and clobber a prior
      // `<to>.path` on rows the `where` rejected. The csv-spec's
      // `nullInputRow` case pins URI_PARTS(NULL) → every output sub-field
      // NULL, so the only way to make EVERY merge COALESCE preserve on
      // gated rows is to feed URI_PARTS a NULL sentinel, not "".
      //
      // Asserted structurally on the conditional EVAL's AST: the CASE's
      // third arg (the "else" branch) must be a NULL literal, not a
      // string literal. Any future cleanup that switches back to "" (or any
      // other non-null sentinel) re-opens the destruction gap for at least
      // the `path` sub-field.
      const tempInputCol = '__streamlang_uri_parts_expression';
      const commands = convertUriPartsProcessorToESQL({
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
        where: { field: 'attributes.enabled', eq: true },
      });
      const inputGateRhs = findEvalAssignmentRhs(commands, tempInputCol);
      expect(isFunctionExpression(inputGateRhs) && inputGateRhs.name === 'CASE').toBe(true);
      const caseExpr = inputGateRhs as Extract<ESQLAstItem, { type: 'function' }>;
      const elseBranch = caseExpr.args[2];
      expect(isLiteral(elseBranch)).toBe(true);
      const literal = elseBranch as Extract<ESQLAstItem, { type: 'literal' }>;
      expect(literal.literalType).toBe('null');
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
