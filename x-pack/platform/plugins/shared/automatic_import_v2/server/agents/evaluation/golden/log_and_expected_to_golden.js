#!/usr/bin/env node
/**
 * Converts an integrations-style test pair (.log + .log-expected.json) into a
 * golden example. Reads input lines from the .log and expected _source docs from
 * the "expected" array in the -expected.json file.
 *
 * Usage:
 *   node log_and_expected_to_golden.js path/to/file.log [path/to/file.log-expected.json]
 *   node log_and_expected_to_golden.js path/to/file.log --id=example-cisco-asa --out=golden/example.json
 *
 * If the expected file is omitted, it defaults to <logpath>-expected.json.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const logPath = args.find((a) => !a.startsWith('--'));
const idArg = args.find((a) => a.startsWith('--id='));
const outArg = args.find((a) => a.startsWith('--out='));

// Optional second positional: expected file (default: <logpath>-expected.json)
const expectedPathArg = args.filter((a) => !a.startsWith('--'))[1];

if (!logPath) {
  console.error(
    'Usage: node log_and_expected_to_golden.js <path/to/file.log> [path/to/file.log-expected.json] [--id=<id>] [--out=<path>]'
  );
  process.exit(1);
}

const cwd = process.cwd();
const absoluteLogPath = path.isAbsolute(logPath) ? logPath : path.resolve(cwd, logPath);
const absoluteExpectedPath = expectedPathArg
  ? path.isAbsolute(expectedPathArg)
    ? expectedPathArg
    : path.resolve(cwd, expectedPathArg)
  : absoluteLogPath.replace(/\.log$/, '') + '.log-expected.json';

if (!fs.existsSync(absoluteLogPath)) {
  console.error('Log file not found:', absoluteLogPath);
  process.exit(1);
}
if (!fs.existsSync(absoluteExpectedPath)) {
  console.error('Expected file not found:', absoluteExpectedPath);
  process.exit(1);
}

const logContent = fs.readFileSync(absoluteLogPath, 'utf8');
const input_logs = logContent
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const expectedContent = fs.readFileSync(absoluteExpectedPath, 'utf8');
let expected_outputs;
try {
  const parsed = JSON.parse(expectedContent);
  expected_outputs = parsed.expected ?? parsed;
  if (!Array.isArray(expected_outputs)) {
    console.error('Expected file must have an "expected" array (or be a JSON array).');
    process.exit(1);
  }
} catch (e) {
  console.error('Invalid JSON in expected file:', e.message);
  process.exit(1);
}

if (input_logs.length !== expected_outputs.length) {
  console.error(
    `Mismatch: log has ${input_logs.length} lines but expected has ${expected_outputs.length} documents.`
  );
  process.exit(1);
}

const exampleId = idArg
  ? idArg.slice('--id='.length)
  : path.basename(absoluteLogPath, path.extname(absoluteLogPath));
const golden = {
  id: exampleId,
  input_logs,
  expected_outputs,
  source_format: 'lines',
};

const goldenDir = path.resolve(__dirname, '.');
const defaultOut = path.join(goldenDir, `${exampleId}.json`);
const outPath = outArg ? path.resolve(cwd, outArg.slice('--out='.length)) : defaultOut;

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

console.log(`Wrote golden example (${input_logs.length} entries) to ${outPath}`);
