#!/usr/bin/env node
/**
 * Exports INGEST_PIPELINE_GENERATOR_PROMPT from prompts.ts into seed_prompts.json
 * for use by the GEPA Python optimizer. Run from repo root or from this directory.
 *
 * Usage: node export_seed_prompts.js
 * Or:    node server/agents/evaluation/gepa/export_seed_prompts.js
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_TS = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'prompts.ts'
);

const SEED_JSON = path.join(__dirname, 'seed_prompts.json');

const START_MARKER = 'export const INGEST_PIPELINE_GENERATOR_PROMPT = `';
const END_LINE = '`;';

function extractPrompt(content) {
  const startIdx = content.indexOf(START_MARKER);
  if (startIdx === -1) {
    throw new Error('INGEST_PIPELINE_GENERATOR_PROMPT not found in prompts.ts');
  }
  const begin = startIdx + START_MARKER.length;
  const afterStart = content.slice(begin);
  const lines = afterStart.split(/\r?\n/);
  // Find the line that is exactly "`;" (closing of template literal)
  let endLineIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === END_LINE) {
      endLineIdx = i;
      break;
    }
  }
  return lines.slice(0, endLineIdx).join('\n');
}

function main() {
  const content = fs.readFileSync(PROMPTS_TS, 'utf8');
  const prompt = extractPrompt(content);
  const payload = { INGEST_PIPELINE_GENERATOR_PROMPT: prompt };
  fs.writeFileSync(SEED_JSON, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', SEED_JSON);
}

main();
