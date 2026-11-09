/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Exemplar {
  /** The `// …` comment that opens the example block, used as its retrieval key. */
  title: string;
  /** The full fenced block, verbatim, so selection never rewrites an example. */
  block: string;
}

const BLOCK_PATTERN = /```esql\n([\s\S]*?)```/g;

/** Decompose the `examples.md` corpus into individually selectable exemplars. */
export const parseExemplars = (markdown: string): Exemplar[] => {
  const exemplars: Exemplar[] = [];
  for (const match of markdown.matchAll(BLOCK_PATTERN)) {
    const body = match[1];
    const firstLine = body.split('\n')[0] ?? '';
    exemplars.push({
      title: firstLine.replace(/^\/\/\s*/, '').trim(),
      block: `\`\`\`esql\n${body}\`\`\``,
    });
  }
  return exemplars;
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'for',
  'to',
  'and',
  'or',
  'by',
  'with',
  'from',
  'is',
  'are',
  'what',
  'how',
  'show',
  'me',
  'my',
  'i',
  'want',
  'see',
  'query',
  'esql',
  'es|ql',
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9_*.]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

/**
 * Retrieve the `k` exemplars whose text overlaps the query most (lexical, no embedding call).
 *
 * Scoring is token overlap against the example's comment plus its query body, normalised by the
 * example's own token count so short, generic examples do not dominate.
 */
export const selectExemplars = (exemplars: Exemplar[], nlQuery: string, k: number): Exemplar[] => {
  const queryTokens = new Set(tokenize(nlQuery));
  if (queryTokens.size === 0) {
    return exemplars.slice(0, k);
  }

  return exemplars
    .map((exemplar, index) => {
      const tokens = tokenize(`${exemplar.title} ${exemplar.block}`);
      const overlap = tokens.filter((token) => queryTokens.has(token)).length;
      return { exemplar, index, score: overlap / Math.sqrt(tokens.length || 1) };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k)
    .sort((a, b) => a.index - b.index)
    .map(({ exemplar }) => exemplar);
};

/** Render the exemplar section injected into the generation prompt. */
export const renderExemplars = (exemplars: Exemplar[]): string =>
  exemplars.map(({ block }) => block).join('\n\n');
