/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Native ESM worker that compiles and runs a Vega spec to surface render-time
 * errors and warnings. It MUST stay a native `.mjs`: the `vega` module graph
 * contains a top-level `await import('canvas')` (via vega-canvas), which cannot
 * be loaded by Kibana's CommonJS server runtime. A worker thread loaded as
 * native ESM bypasses that constraint without `eval`/`new Function`.
 */

import { parentPort } from 'node:worker_threads';
import { parse, View } from 'vega';

/**
 * Replace ES|QL `url` data sources with inline sample rows so the headless run
 * does not attempt a network fetch. Derived data sets (those with a `source`)
 * are left untouched so their transforms still execute against the sample data.
 */
const inlineData = (spec, rows) => {
  if (!Array.isArray(spec.data)) {
    return spec;
  }
  for (const dataSet of spec.data) {
    if (dataSet && typeof dataSet === 'object' && 'url' in dataSet) {
      delete dataSet.url;
      delete dataSet.format;
      if (!('source' in dataSet)) {
        dataSet.values = Array.isArray(rows) ? rows : [];
      }
    }
  }
  return spec;
};

const validate = async (spec, rows) => {
  const warnings = [];
  const logger = {
    _level: 2,
    level(value) {
      if (arguments.length) {
        this._level = value;
        return this;
      }
      return this._level;
    },
    error() {
      throw new Error(Array.from(arguments).join(' '));
    },
    warn() {
      warnings.push(Array.from(arguments).join(' '));
      return this;
    },
    info() {
      return this;
    },
    debug() {
      return this;
    },
  };

  const runtime = parse(inlineData(spec, rows), undefined, { ast: true });
  const view = new View(runtime, { renderer: 'none', logger });
  await view.runAsync();
  await view.finalize();

  return warnings;
};

parentPort.on('message', async ({ id, spec, rows }) => {
  try {
    const warnings = await validate(spec, rows);
    parentPort.postMessage({ id, ok: true, warnings });
  } catch (error) {
    parentPort.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
