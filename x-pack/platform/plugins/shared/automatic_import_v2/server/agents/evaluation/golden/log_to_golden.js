#!/usr/bin/env node
/**
 * Converts a raw .log file into a golden example JSON.
 * Splits the file by newlines; each non-empty line becomes one entry in input_logs
 * and a minimal expected_outputs entry { "message": "<line>" }.
 *
 * Run from repo root or from this directory.
 *
 * Usage:
 *   node log_to_golden.js path/to/file.log
 *   node log_to_golden.js path/to/file.log --id example-citrix
 *   node log_to_golden.js path/to/file.log --out /path/to/example-citrix.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const logPath = args.find((a) => !a.startsWith('--'));
const idArg = args.find((a) => a.startsWith('--id='));
const outArg = args.find((a) => a.startsWith('--out='));

if (!logPath) {
  console.error('Usage: node log_to_golden.js <path/to/file.log> [--id=<example-id>] [--out=<path>]');
  process.exit(1);
}

const absoluteLogPath = path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
if (!fs.existsSync(absoluteLogPath)) {
  console.error('File not found:', absoluteLogPath);
  process.exit(1);
}

const content = fs.readFileSync(absoluteLogPath, 'utf8');
const input_logs = content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

if (input_logs.length === 0) {
  console.error('No non-empty lines in file.');
  process.exit(1);
}

const exampleId = idArg ? idArg.slice('--id='.length) : path.basename(absoluteLogPath, path.extname(absoluteLogPath));
const expected_outputs = input_logs.map((line) => ({ message: line }));

const golden = {
  id: exampleId,
  input_logs,
  expected_outputs,
  source_format: 'lines',
};

const goldenDir = path.resolve(__dirname, '.');
const defaultOut = path.join(goldenDir, `${exampleId}.json`);
const outPath = outArg ? path.resolve(process.cwd(), outArg.slice('--out='.length)) : defaultOut;

const jsonStr = JSON.stringify(golden, null, 2);
fs.writeFileSync(outPath, jsonStr, 'utf8');
// Validate round-trip so we never write invalid JSON
try {
  JSON.parse(fs.readFileSync(outPath, 'utf8'));
} catch (e) {
  console.error('Wrote file but round-trip validation failed:', e.message);
  process.exit(1);
}

// Auto-add to manifest if writing into golden dir
if (path.dirname(outPath) === goldenDir) {
  const manifestPath = path.join(goldenDir, 'manifest.json');
  let manifest = { train: [], val: [] };
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest.train)) manifest.train = [];
    if (!Array.isArray(manifest.val)) manifest.val = [];
  }
  if (!manifest.train.includes(exampleId) && !manifest.val.includes(exampleId)) {
    manifest.train.push(exampleId);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Added "${exampleId}" to manifest.json train.`);
  }
}

console.log(`Wrote ${input_logs.length} log entries to ${outPath}`);
