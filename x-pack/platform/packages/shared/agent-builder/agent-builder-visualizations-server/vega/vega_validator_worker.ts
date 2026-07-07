/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Worker-thread task that compiles a Vega-Lite spec to Vega and runs it headless
 * to surface compile- and render-time errors (and warnings) before the spec is
 * stored. It runs in a worker (not in-process) because `vega`/`vega-lite` are
 * ESM-only with top-level `await` (the `vega` graph does a top-level
 * `await import('canvas')` via vega-canvas), which Kibana's CommonJS runtime
 * cannot `require`. Spawned via `vega_validator_wrapper.js`.
 */

import { parentPort } from 'node:worker_threads';

// `vega`/`vega-lite` are ESM-only with top-level await; Kibana's CJS build
// cannot `require` them, and babel rewrites a direct `await import()` into a CJS
// `require`. Loading through an eval'd dynamic import keeps the import native at
// runtime (same approach as @kbn/ink's prepare_ink.ts).
// eslint-disable-next-line no-new-func
const dynamicImport = new Function('path', 'return import(path);') as (
  path: string
) => Promise<unknown>;

/** Minimal structural typings for the small `vega`/`vega-lite` surface we use. */
type CompileFn = (spec: object, opts: { logger: unknown }) => { spec: object };
type ParseFn = (spec: object, config: undefined, opts: { ast: boolean }) => object;
interface VegaView {
  runAsync: () => Promise<unknown>;
  finalize: () => void;
}
type ViewCtor = new (runtime: object, opts: { renderer: 'none'; logger: unknown }) => VegaView;

interface ValidationRequest {
  spec: Record<string, unknown>;
}

let libs: Promise<{ compile: CompileFn; parse: ParseFn; View: ViewCtor }> | undefined;

const loadLibs = () => {
  if (!libs) {
    libs = (async () => {
      const [vegaLite, vega] = (await Promise.all([
        dynamicImport('vega-lite'),
        dynamicImport('vega'),
      ])) as [{ compile: CompileFn }, { parse: ParseFn; View: ViewCtor }];
      return { compile: vegaLite.compile, parse: vega.parse, View: vega.View };
    })();
  }
  return libs;
};

/**
 * Swap the Kibana ES|QL `data` source (a `{ url: { '%type%': 'esql', … } }`
 * object Vega cannot fetch) for an inline empty dataset so the headless run
 * does not attempt a network fetch. Validation only needs the spec's structure
 * (compile/transform/expression errors surface without data).
 */
const inlineData = (spec: Record<string, unknown>) => ({
  ...spec,
  data: { values: [] },
});

const createCollectingLogger = (warnings: string[]) => ({
  _level: 2,
  level(this: { _level: number }, value?: number) {
    if (value === undefined) {
      return this._level;
    }
    this._level = value;
    return this;
  },
  error(...args: unknown[]) {
    // Turn a logged error into a thrown one so the host retries authoring.
    throw new Error(args.join(' '));
  },
  warn(...args: unknown[]) {
    warnings.push(args.join(' '));
    return this;
  },
  info() {
    return this;
  },
  debug() {
    return this;
  },
});

const validate = async (spec: Record<string, unknown>): Promise<string[]> => {
  const { compile, parse, View } = await loadLibs();
  const warnings: string[] = [];
  const logger = createCollectingLogger(warnings);

  // Vega-Lite compile: catches invalid marks/encodings/transforms/scales.
  const { spec: vegaSpec } = compile(inlineData(spec), { logger });

  // Vega render (headless, AST interpreter so no eval/CSP concerns): catches
  // render-time errors compilation cannot, e.g. bad expressions or transforms.
  const runtime = parse(vegaSpec, undefined, { ast: true });
  const view = new View(runtime, { renderer: 'none', logger });
  await view.runAsync();
  view.finalize();

  return warnings;
};

parentPort?.on('message', async ({ spec }: ValidationRequest) => {
  try {
    const warnings = await validate(spec);
    parentPort?.postMessage({ ok: true, warnings });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
