/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compares two benchmark JSON reports and outputs a markdown delta table.
 *
 * Usage: npx ts-node compare_benchmark_results.ts <baseline.json> <experiment.json>
 */

import * as fs from 'fs';
import * as path from 'path';

interface MetricStats {
  values: number[];
  median: number;
  p95: number;
  mean: number;
  cv: number;
}

interface BenchmarkReport {
  scenario: string;
  theme: string;
  timestamp: string;
  runs: number;
  metrics: Record<string, MetricStats>;
}

const write = (text: string) => process.stdout.write(text + '\n');
const writeErr = (text: string) => process.stderr.write(text + '\n');

const formatValue = (value: number, key: string): string => {
  if (key.toLowerCase().includes('count')) {
    return value.toFixed(0);
  }
  if (value < 1) {
    return `${(value * 1000).toFixed(1)}ms`;
  }
  return `${value.toFixed(1)}ms`;
};

const formatDelta = (delta: number, key: string): string => {
  const sign = delta >= 0 ? '+' : '';
  if (key.toLowerCase().includes('count')) {
    return `${sign}${delta.toFixed(0)}`;
  }
  if (Math.abs(delta) < 1) {
    return `${sign}${(delta * 1000).toFixed(1)}ms`;
  }
  return `${sign}${delta.toFixed(1)}ms`;
};

const main = () => {
  const [baselinePath, experimentPath] = process.argv.slice(2);

  if (!baselinePath || !experimentPath) {
    writeErr('Usage: npx ts-node compare_benchmark_results.ts <baseline.json> <experiment.json>');
    process.exit(1);
  }

  const baseline: BenchmarkReport = JSON.parse(
    fs.readFileSync(path.resolve(baselinePath), 'utf-8')
  );
  const experiment: BenchmarkReport = JSON.parse(
    fs.readFileSync(path.resolve(experimentPath), 'utf-8')
  );

  write(`\n## ${baseline.scenario} — Baseline vs Experiment\n`);
  write(`| Metric | Baseline (median) | Experiment (median) | Delta | Change |`);
  write(`|--------|-------------------|---------------------|-------|--------|`);

  const allKeys = new Set([...Object.keys(baseline.metrics), ...Object.keys(experiment.metrics)]);

  for (const key of allKeys) {
    const bMedian = baseline.metrics[key]?.median ?? 0;
    const eMedian = experiment.metrics[key]?.median ?? 0;
    const delta = eMedian - bMedian;
    const pctChange = bMedian !== 0 ? ((delta / bMedian) * 100).toFixed(1) + '%' : 'N/A';

    write(
      `| ${key} | ${formatValue(bMedian, key)} | ${formatValue(eMedian, key)} | ${formatDelta(
        delta,
        key
      )} | ${pctChange} |`
    );
  }

  write(
    `\n_Baseline: ${baseline.runs} runs @ ${baseline.timestamp} | Experiment: ${experiment.runs} runs @ ${experiment.timestamp}_\n`
  );
};

main();
