/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { codeGrep } from './discover_logging_sites';
import { FUNCTION_DEFINITION_PATTERNS, WRAPPER_DISCOVERY_LIMITS } from './constants';

/**
 * Bare language keywords a loose definition-line grep can occasionally line up
 * with a "name" token. Never a real wrapper name, so always dropped alongside
 * the `minWrapperNameLength` filter.
 */
const NON_WRAPPER_NAMES: ReadonlySet<string> = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'function',
  'def',
  'fn',
  'func',
  'end',
]);

/**
 * In-process (NOT Lucene) regexes that pull the declared name out of a line
 * already known -- via {@link FUNCTION_DEFINITION_PATTERNS} -- to be a
 * definition. Keyed the same as `FUNCTION_DEFINITION_PATTERNS`; `unknown` is
 * the generic fallback: the first `identifier(` token on the line, which is
 * the function name once the line has already been filtered to a definition
 * (a preceding return-type token is never itself followed by `(`).
 */
const NAME_EXTRACTORS: Readonly<Record<string, RegExp>> = {
  Go: /func\s+(?:\([^)]*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  Elixir: /defp?\s+([A-Za-z_][A-Za-z0-9_!?]*)/,
  Rust: /fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  Python: /def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  Ruby: /def\s+(?:self\.)?([A-Za-z_][A-Za-z0-9_!?=]*)/,
  unknown: /([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
};

const extractDefinitionName = (language: string | undefined, content: string): string | null => {
  const extractor = (language && NAME_EXTRACTORS[language]) || NAME_EXTRACTORS.unknown;
  const match = extractor.exec(content.trim());
  return match?.[1] ?? null;
};

/**
 * Escapes a wrapper name for use inside a Lucene RLIKE pattern -- wraps every
 * regex-special character in its own single-char class (e.g. `[.]`), the same
 * convention used throughout {@link LOGGER_IDIOM_PATTERNS}.
 */
export const escapeLuceneLiteral = (value: string): string =>
  value.replace(/[.^$|()[\]{}*+?\\]/g, (char) => `[${char}]`);

interface DefinitionLine {
  line: number;
  name: string;
}

export interface DiscoverLoggingWrappersOptions {
  esClient: ElasticsearchClient;
  /** Git org (matched with MATCH); `*` for any. */
  gitOrg: string;
  /** Git repo (LIKE wildcard); `*` for any. */
  gitRepo: string;
  /** Immutable commit (LIKE wildcard); `*` for any. */
  gitCommit: string;
  /** Repository-relative service scope, e.g. `<serviceRoot>/**` (used for logging only). */
  filePath: string;
  language?: string;
  logger: Logger;
  /** Idiom hit locations already found by {@link discoverLoggingSites}, as `path:line`. */
  idiomHitLocations: readonly string[];
  /** Max lines returned per grep (same contract as {@link codeGrep}). */
  perPatternLimit: number;
}

/**
 * Finds a service's own logging-wrapper function names by containment: a
 * function definition "emits" when an idiom hit (or, in later rounds, a call
 * to an already-discovered wrapper) falls between that definition's line and
 * the next definition's line in the same file. Seeded on the files with the
 * most idiom hits (a house logger lives in a dedicated module, concentrating
 * hits there), iterated up to `WRAPPER_DISCOVERY_LIMITS.maxRounds` times to
 * follow multi-hop wrapping (`log_error` -> `log` -> `Logger.error`).
 *
 * Every Elasticsearch call is wrapped so a failure is logged at debug and
 * skipped (INV-003) -- this function never throws.
 */
export async function discoverLoggingWrappers({
  esClient,
  gitOrg,
  gitRepo,
  gitCommit,
  filePath,
  language,
  logger,
  idiomHitLocations,
  perPatternLimit,
}: DiscoverLoggingWrappersOptions): Promise<string[]> {
  const { maxSeedFiles, maxRounds, maxWrapperNames, minWrapperNameLength } =
    WRAPPER_DISCOVERY_LIMITS;

  // 1. Group idiom hits by file; sort by hit count descending; take the top
  // `maxSeedFiles`.
  const hitLinesByFile = new Map<string, number[]>();
  for (const location of idiomHitLocations) {
    const idx = location.lastIndexOf(':');
    if (idx === -1) {
      continue;
    }
    const path = location.slice(0, idx);
    const lineNumber = Number(location.slice(idx + 1));
    if (!Number.isFinite(lineNumber)) {
      continue;
    }
    const lines = hitLinesByFile.get(path) ?? [];
    lines.push(lineNumber);
    hitLinesByFile.set(path, lines);
  }

  const seedFiles = [...hitLinesByFile.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxSeedFiles)
    .map(([path]) => path);

  if (seedFiles.length === 0) {
    return [];
  }

  const definitionPatterns =
    (language && FUNCTION_DEFINITION_PATTERNS[language]) || FUNCTION_DEFINITION_PATTERNS.unknown;

  let grepsIssued = 0;

  // 2. Grep each seed file once for definition lines (the definitions
  // themselves do not change across rounds; only which ones are "emitting" does).
  const definitionsByFile = new Map<string, DefinitionLine[]>();
  for (const path of seedFiles) {
    const definitions: DefinitionLine[] = [];
    for (const regex of definitionPatterns) {
      grepsIssued += 1;
      try {
        const lines = await codeGrep({
          esClient,
          gitOrg,
          gitRepo,
          gitCommit,
          filePath: path,
          regex,
          limit: perPatternLimit,
        });
        for (const { lineNumber, content } of lines) {
          const name = extractDefinitionName(language, content);
          if (name) {
            definitions.push({ line: lineNumber, name });
          }
        }
      } catch (error) {
        logger.debug(
          `logging_wrappers: definition grep failed for "${path}" pattern ${JSON.stringify(
            regex
          )}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    definitions.sort((a, b) => a.line - b.line);
    definitionsByFile.set(path, definitions);
  }

  // Emitting lines per file, seeded with the idiom hits (round 1).
  const emittingLinesByFile = new Map<string, Set<number>>();
  for (const [path, lines] of hitLinesByFile) {
    emittingLinesByFile.set(path, new Set(lines));
  }

  const roundFound = new Map<string, number>();
  const orderedNames: string[] = [];

  for (let round = 1; round <= maxRounds; round += 1) {
    let addedInRound = false;

    // 3-4. Mark definitions as emitting, collecting new wrapper names.
    for (const path of seedFiles) {
      const definitions = definitionsByFile.get(path) ?? [];
      const emittingLines = emittingLinesByFile.get(path) ?? new Set<number>();
      for (let i = 0; i < definitions.length; i += 1) {
        const { line, name } = definitions[i];
        if (roundFound.has(name)) {
          continue;
        }
        if (name.length < minWrapperNameLength || NON_WRAPPER_NAMES.has(name)) {
          continue;
        }
        const nextLine = definitions[i + 1]?.line ?? Infinity;
        const isEmitting = [...emittingLines].some((l) => l >= line && l < nextLine);
        if (isEmitting) {
          roundFound.set(name, round);
          orderedNames.push(name);
          addedInRound = true;
        }
      }
    }

    // 5. Stop early when a round adds no new name.
    if (!addedInRound || round === maxRounds) {
      break;
    }

    // Prepare the next round: grep each seed file for calls to every wrapper
    // name discovered so far (one grep per file per round, INV-002).
    const alternation = [...roundFound.keys()].map(escapeLuceneLiteral).join('|');
    const callRegex = `.*(${alternation})[(].*`;
    for (const path of seedFiles) {
      grepsIssued += 1;
      try {
        const lines = await codeGrep({
          esClient,
          gitOrg,
          gitRepo,
          gitCommit,
          filePath: path,
          regex: callRegex,
          limit: perPatternLimit,
        });
        const set = emittingLinesByFile.get(path) ?? new Set<number>();
        for (const { lineNumber } of lines) {
          set.add(lineNumber);
        }
        emittingLinesByFile.set(path, set);
      } catch (error) {
        logger.debug(
          `logging_wrappers: wrapper-call grep failed for "${path}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  // 6. Later rounds are closer to the call sites and therefore more valuable;
  // cap at `maxWrapperNames`, preferring later-round names first.
  const result = [...orderedNames].reverse().slice(0, maxWrapperNames);

  const roundsRun = roundFound.size > 0 ? Math.max(...roundFound.values()) : 0;
  logger.debug(
    `logging_wrappers: found ${result.length} wrapper name(s) across ${roundsRun} round(s) ` +
      `(${grepsIssued} grep(s) issued) for scope "${filePath}"`
  );

  return result;
}
