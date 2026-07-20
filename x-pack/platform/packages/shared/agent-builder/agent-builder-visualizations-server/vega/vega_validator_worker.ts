/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parentPort } from 'node:worker_threads';

type CompileFn = (spec: object, opts: { logger: unknown }) => { spec: object };
type ParseFn = (spec: object, config: undefined, opts: { ast: boolean }) => object;

interface VegaView {
  runAsync: () => Promise<unknown>;
  finalize: () => void;
}

interface VegaLoader {
  load: (uri: string) => Promise<string>;
  sanitize: (uri: string) => Promise<{ href: string }>;
}

type ViewCtor = new (
  runtime: object,
  opts: { renderer: 'none'; logger: unknown; loader: VegaLoader; expr: unknown }
) => VegaView;

interface VegaLibs {
  compile: CompileFn;
  parse: ParseFn;
  View: ViewCtor;
  expressionInterpreter: unknown;
}

interface ValidationRequest {
  spec: Record<string, unknown>;
}

type LoadVegaLibs = () => Promise<VegaLibs>;

const inlineData = (spec: Record<string, unknown>): Record<string, unknown> => ({
  ...spec,
  data: { values: [] },
});

/**
 * Validation never needs external data. Reject every load so an LLM-authored
 * URL cannot cause an SSRF request or local-file read from the Kibana server.
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
  const { spec: vegaSpec } = compile(inlineData(spec), { logger });
  const runtime = parse(vegaSpec, undefined, { ast: true });
  const view = new View(runtime, {
    renderer: 'none',
    logger,
    loader: createRejectingLoader(),
    expr: expressionInterpreter,
  });

  try {
    await view.runAsync();
  } finally {
    view.finalize();
  }

  return warnings;
};

/**
 * Register the worker message handler. The untransformed CJS wrapper injects
 * ESM-only Vega libraries loaded with native import(), keeping this TypeScript
 * task free of Babel-rewritten imports and string-based code generation.
 */
export const startVegaValidatorWorker = (loadVegaLibs: LoadVegaLibs): void => {
  let libs: Promise<VegaLibs> | undefined;
  const getLibs = () => {
    libs ??= loadVegaLibs();
    return libs;
  };

  parentPort?.on('message', async ({ spec }: ValidationRequest) => {
    let vegaLibs: VegaLibs;
    try {
      vegaLibs = await getLibs();
    } catch (error) {
      parentPort?.postMessage({
        ok: false,
        infraError: error instanceof Error ? error.message : String(error),
      });
      return;
    }

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
};
