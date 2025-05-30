/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import patternsFile from './pattern_file.txt';

export type GrokPatternMap = Record<string, string>;

export interface VerificationIssue {
  type: 'missing' | 'cycle' | 'syntax';
  pattern: string; // pattern being processed when the problem occurred
  reference?: string; // undefined for 'cycle' | 'syntax'
  trace?: string[]; // only on cycles
  error?: string; // RegExp compile message (syntax)
}

/** Regex that finds the pattern name inside %{FOO}, %{FOO:field}, %{FOO:field:type}. */
const PATTERN_REF = /%{([^}:]+)(?::[^}]*)?}/g;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * JavaScript's `RegExp` lacks PCRE features such as *atomic groups* (`(?> …)`)
 * and *possessive quantifiers*.  We downgrade them so the pattern can still be
 * *compiled* for quick client-side validation.  Semantics stay *close enough*
 * for most ingest use-cases (atomic → non-capturing means a tad more back-
 * tracking, which only hurts extreme edge-cases).
 */
function pcreToJs(pattern: string): string {
  return (
    pattern
      // 1. Atomic groups  (?>…)  →  (?:…)
      .replace(/\(\?>/g, '(?:')
      // 2. Possessive quantifiers  X++  →  X+
      .replace(/([*+?]|\{\d+(?:,\d+)?\})\+/g, '$1')
  );
}

interface ResolveResult {
  resolved: GrokPatternMap;
  issues: VerificationIssue[];
}

/**
 * Recursively expands every %{PATTERN} reference so that the returned map
 * contains *fully inlined* regular expressions.  Also detects three classes of
 * errors:
 *   • *missing*  – reference to an undefined pattern
 *   • *cycle*    – circular dependencies (A → B → … → A)
 *   • *syntax*   – pattern cannot be compiled by JS RegExp after PCRE → JS
 */
function buildResolvedPatterns(patterns: GrokPatternMap): ResolveResult {
  const resolved = new Map<string, string>();
  const inProgress = new Set<string>();
  const issues: VerificationIssue[] = [];

  function expand(name: string, stack: string[]): string | undefined {
    // Already expanded – return cached version
    if (resolved.has(name)) return resolved.get(name)!;

    // Cycle detection
    if (inProgress.has(name)) {
      issues.push({ type: 'cycle', pattern: name, trace: [...stack, name] });
      return undefined;
    }

    const body = patterns[name];
    if (body === undefined) {
      // Reference to an unknown pattern – report against the caller
      issues.push({ type: 'missing', pattern: stack.at(-1) ?? name, reference: name });
      return undefined;
    }

    inProgress.add(name);

    // Inline all nested %{SUBPATTERN} occurrences (field/type suffix ignored)
    const inlined = body.replace(PATTERN_REF, (_m, ref) => {
      const sub = expand(ref, [...stack, name]);
      return sub ?? '';
    });

    inProgress.delete(name);

    // Downgrade PCRE → JS so that we can validate syntax client-side
    const jsRegex = pcreToJs(inlined);

    // Try compiling – V8 will throw on unsupported look-behind or similar
    try {
      new RegExp(jsRegex);
    } catch (err) {
      issues.push({
        type: 'syntax',
        pattern: name,
        error: (err as Error).message,
      });
    }

    resolved.set(name, jsRegex);
    return jsRegex;
  }

  // Kick-off expansion for every top-level key
  for (const key of Object.keys(patterns)) {
    expand(key, []);
  }

  // Convert Map → plain object for downstream consumption / JSON serialisation
  const resolvedObj: GrokPatternMap = {};
  for (const [k, v] of resolved.entries()) resolvedObj[k] = v;

  return { resolved: resolvedObj, issues };
}

/**
 * Reads the bundled `pattern_file.txt` and returns a *fully resolved* map where
 * every reference has been inlined **and** upgraded to a JavaScript-compatible
 * regular expression.  If the file contains undefined references, circular
 * definitions, or patterns that still fail to compile the function **throws**,
 * preventing Kibana from starting with an invalid pattern set.
 */

export const getRawPatternMap = once(() => {
  // 1. Parse the raw file into a key → raw-regex map
  const rawMap: GrokPatternMap = {};
  for (const raw of patternsFile.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue; // skip blanks & comments
    const [key, ...rest] = line.split(/\s+/);
    rawMap[key] = rest.join(' ');
  }
  return rawMap;
});

export const getGrokPatternMap = once((): GrokPatternMap => {
  const rawMap = getRawPatternMap();

  // 2. Resolve nested references and validate
  const { resolved, issues } = buildResolvedPatterns(rawMap);
  if (issues.length) {
    throw new Error(
      `Encountered ${issues.length} issue(s) while resolving grok patterns:\n` +
        JSON.stringify(issues, null, 2)
    );
  }

  return resolved;
});
