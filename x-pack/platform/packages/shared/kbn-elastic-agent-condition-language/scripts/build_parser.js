/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// One-shot regen script for the agent condition expression parser.
//
// Resolves the latest tagged release of elastic/elastic-agent, fetches Eql.g4
// from that tag, spawns the ANTLR4 tool, then post-processes the output:
// renames PascalCase files to snake_case, rewrites their sibling imports, and
// prepends the Elastic 2.0 license header + `@ts-nocheck`. The temp grammar
// file is deleted at the end — only the four generated `.ts` files (plus this
// script) are committed.
//
// Prereqs: Node 20+ (built-in fetch), Java 11+, ANTLR4 tool 4.13.2 on PATH.

const { spawnSync } = require('node:child_process');
const {
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  readdirSync,
  mkdirSync,
} = require('node:fs');
const { basename, extname, join } = require('node:path');
const { snakeCase } = require('lodash');

const REPO = 'elastic/elastic-agent';
const GRAMMAR_PATH = 'internal/pkg/eql/Eql.g4';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

const PACKAGE_ROOT = join(__dirname, '..');
const PARSER_DIR = join(PACKAGE_ROOT, 'src', 'parser');
const TEMP_GRAMMAR_PATH = join(PARSER_DIR, 'Eql.g4');

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
`;

async function resolveLatestTag() {
  console.log(`Resolving latest release tag from ${LATEST_RELEASE_URL}`);
  const res = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve latest release: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.tag_name) {
    throw new Error(`No tag_name in latest release payload`);
  }
  return data.tag_name;
}

async function fetchGrammar(tag) {
  const url = `https://raw.githubusercontent.com/${REPO}/${tag}/${GRAMMAR_PATH}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch grammar: ${res.status} ${res.statusText}`);
  }
  writeFileSync(TEMP_GRAMMAR_PATH, await res.text(), 'utf8');
}

function runAntlr() {
  console.log('Running ANTLR4');
  const result = spawnSync('antlr', ['-Dlanguage=TypeScript', '-visitor', '-listener', 'Eql.g4'], {
    cwd: PARSER_DIR,
    stdio: 'inherit',
  });
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      '`antlr` is not on PATH. Install the ANTLR4 tool 4.13.2 (e.g. `brew install antlr`) and retry. See README.md for details.'
    );
  }
  if (result.status !== 0) {
    throw new Error(`ANTLR exited with status ${result.status}`);
  }
}

// Walk every file in PARSER_DIR (except the temp grammar) and rename its
// basename to snake_case using lodash. Returns the basename map so the
// import-rewrite step can resolve old → new without redoing the work.
function renameGeneratedFilesToSnakeCase() {
  console.log('Renaming Pascal → snake_case');
  const basenameMap = new Map(); // 'EqlLexer' → 'eql_lexer'
  for (const file of readdirSync(PARSER_DIR)) {
    if (file === 'Eql.g4') continue; // temp grammar — left for cleanup step
    const ext = extname(file);
    const base = basename(file, ext);
    const snake = snakeCase(base);
    if (snake === base) continue; // already snake_case
    renameSync(join(PARSER_DIR, file), join(PARSER_DIR, `${snake}${ext}`));
    basenameMap.set(base, snake);
  }
  return basenameMap;
}

// In each renamed `.ts` file, rewrite sibling imports to point at the new
// snake_case basenames, and prepend the license header + `@ts-nocheck`.
function rewriteTsFiles(basenameMap) {
  console.log('Rewriting imports + prepending license header + @ts-nocheck');
  for (const file of readdirSync(PARSER_DIR)) {
    if (extname(file) !== '.ts') continue;
    const path = join(PARSER_DIR, file);
    let content = readFileSync(path, 'utf8');

    for (const [oldBase, newBase] of basenameMap) {
      content = content.replaceAll(`./${oldBase}.js`, `./${newBase}.js`);
    }

    if (!content.includes('Elastic License')) {
      content = `${LICENSE_HEADER}// @ts-nocheck\n${content}`;
    }

    writeFileSync(path, content, 'utf8');
  }
}

function resetParserDir() {
  console.log(`Wiping ${PARSER_DIR}`);
  rmSync(PARSER_DIR, { recursive: true, force: true });
  mkdirSync(PARSER_DIR, { recursive: true });
}

(async () => {
  try {
    resetParserDir();
    const tag = await resolveLatestTag();
    console.log(`Resolved tag: ${tag}`);
    await fetchGrammar(tag);
    runAntlr();
    const renamed = renameGeneratedFilesToSnakeCase();
    rewriteTsFiles(renamed);
    console.log('Done.');
  } finally {
    // Always clean up the temp grammar so it isn't committed.
    rmSync(TEMP_GRAMMAR_PATH, { force: true });
  }
})().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
