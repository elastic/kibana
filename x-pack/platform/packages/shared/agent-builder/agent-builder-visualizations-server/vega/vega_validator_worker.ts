/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Worker-thread task that validates a Vega-family spec headlessly: Vega-Lite
 * specs are compiled to Vega first; Raw Vega specs skip compile. Both paths
 * then `parse` + `View.runAsync` to surface compile-/render-time errors (and
 * warnings) before the spec is stored. It runs in a worker (not in-process)
 * because `vega`/`vega-lite` are ESM-only with top-level `await` (the `vega`
 * graph does a top-level `await import('canvas')` via vega-canvas), which
 * Kibana's CommonJS runtime cannot `require`. Spawned via
 * `vega_validator_wrapper.js`.
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
/** The `vega-loader` surface a `View` uses to fetch external resources. */
interface VegaLoader {
  load: (uri: string) => Promise<string>;
  sanitize: (uri: string) => Promise<{ href: string }>;
}
type ViewCtor = new (
  runtime: object,
  opts: { renderer: 'none'; logger: unknown; loader: VegaLoader; expr: unknown }
) => VegaView;

interface ValidationRequest {
  spec: Record<string, unknown>;
}

interface VegaLibs {
  compile: CompileFn;
  parse: ParseFn;
  View: ViewCtor;
  /**
   * `vega-interpreter`'s AST interpreter, passed to the `View` as `expr` so
   * spec expressions are evaluated by the interpreter instead of Vega's default
   * `new Function()` codegen — see the security note on `validate` below.
   */
  expressionInterpreter: unknown;
}

let libs: Promise<VegaLibs> | undefined;

const loadLibs = () => {
  if (!libs) {
    libs = (async () => {
      const [vegaLite, vega, vegaInterpreter] = (await Promise.all([
        dynamicImport('vega-lite'),
        dynamicImport('vega'),
        dynamicImport('vega-interpreter'),
      ])) as [
        { compile: CompileFn },
        { parse: ParseFn; View: ViewCtor },
        { expressionInterpreter: unknown }
      ];
      return {
        compile: vegaLite.compile,
        parse: vega.parse,
        View: vega.View,
        expressionInterpreter: vegaInterpreter.expressionInterpreter,
      };
    })();
  }
  return libs;
};

/** Whether `$schema` identifies Raw Vega (not Vega-Lite). */
const isRawVegaSchema = (schema: unknown): boolean =>
  typeof schema === 'string' &&
  schema.includes('schema/vega/') &&
  !schema.includes('schema/vega-lite/');

/**
 * Swap Kibana ES|QL `data` sources (urls Vega cannot fetch) for inline empty
 * datasets so the headless run does not attempt a network fetch. Handles both
 * Vega-Lite's single `data` object and Raw Vega's named `data` array.
 * Validation only needs the spec's structure (compile/transform/expression
 * errors surface without data).
 */
const inlineData = (spec: Record<string, unknown>): Record<string, unknown> => {
  const { data } = spec;
  if (Array.isArray(data)) {
    return {
      ...spec,
      data: data.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return entry;
        }
        const dataset = entry as Record<string, unknown>;
        if (!('url' in dataset)) {
          return dataset;
        }
        const { url: _url, ...rest } = dataset;
        return { ...rest, values: [] };
      }),
    };
  }
  return {
    ...spec,
    data: { values: [] },
  };
};

/**
 * A `vega-loader` that refuses every fetch. Validation only needs the spec's
 * structure, never remote data, and the spec is LLM-authored from user prompts,
 * so any `url` left in it (a top-level source, a nested view's `data`, a
 * `lookup` transform's `from.data.url`, or an image mark) must not be fetched by
 * the headless render — that runs on the Kibana server and would be a blind SSRF
 * (cloud-metadata / internal-service reachability) or local-file read. Blocking
 * at the loader closes every variant at once. A blocked load is surfaced by Vega
 * as a warning (`df.warn('Loading failed', …)`), not an error, so it leaves the
 * dataset empty rather than failing validation; genuine compile/render errors
 * still surface.
 */
const createRejectingLoader = (): VegaLoader => {
  const reject = () => Promise.reject(new Error('external loading disabled during validation'));
  return { load: reject, sanitize: reject };
};

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

const validate = async (
  { compile, parse, View, expressionInterpreter }: VegaLibs,
  spec: Record<string, unknown>
): Promise<string[]> => {
  const warnings: string[] = [];
  const logger = createCollectingLogger(warnings);

  // Vega-Lite must compile first; Raw Vega specs are already Vega and skip it.
  const prepared = inlineData(spec);
  const vegaSpec = isRawVegaSchema(spec.$schema) ? prepared : compile(prepared, { logger }).spec;

  // Vega render (headless): catches render-time errors compilation cannot, e.g.
  // bad expressions or transforms. `{ ast: true }` alone only stores expressions
  // as an AST — Vega still evaluates them via `new Function()` codegen unless the
  // `View` is also given `expr: expressionInterpreter`. Since these specs are
  // LLM-authored from (untrusted, prompt-injectable) user input and this runs on
  // the Kibana server, we pass the interpreter so spec expressions never reach
  // codegen — matching the Vega plugin's `vega_base_view.js` CSP-safe config.
  const runtime = parse(vegaSpec, undefined, { ast: true });
  const view = new View(runtime, {
    renderer: 'none',
    logger,
    loader: createRejectingLoader(),
    expr: expressionInterpreter,
  });
  await view.runAsync();
  view.finalize();

  return warnings;
};

parentPort?.on('message', async ({ spec }: ValidationRequest) => {
  // A lib-load failure (e.g. a packaging/resolution problem in a distributable)
  // is an infra fault, not a spec rejection: report it distinctly so the host
  // fails open instead of feeding a meaningless error back to the model.
  let vegaLibs: VegaLibs;
  try {
    vegaLibs = await loadLibs();
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      infraError: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // From here a thrown error is Vega rejecting the spec (compile/render).
  try {
    const warnings = await validate(vegaLibs, spec);
    parentPort?.postMessage({ ok: true, warnings });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
