/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expressionInterpreter } from 'vega-interpreter';

type Functions = Record<string, unknown>;
interface Context {
  functions: Functions;
}

/**
 * Functions `vega-interpreter@2.2.1` lacks or evaluates differently from
 * Vega's code generator: it has no `hypot`, and reads `datetime(ms)` as a
 * year, so a temporal domain Vega-Lite compiles from timestamps is invalid.
 */
const CODEGEN_PARITY: Functions = {
  datetime: (...args: ConstructorParameters<typeof Date>) => new Date(...args),
  hypot: Math.hypot,
};

const patched = new WeakMap<Functions, Context>();

const withParity = ({ functions }: Context): Context => {
  let context = patched.get(functions);
  if (context === undefined) {
    context = {
      functions: Object.assign(Object.create(functions) as Functions, CODEGEN_PARITY),
    };
    patched.set(functions, context);
  }
  return context;
};

/** {@link expressionInterpreter} with {@link CODEGEN_PARITY} over each runtime's functions. */
export const expressionEvaluator = {
  operator: (ctx: Context, expr: unknown): unknown =>
    expressionInterpreter.operator(withParity(ctx), expr),
  parameter: (ctx: Context, expr: unknown): unknown =>
    expressionInterpreter.parameter(withParity(ctx), expr),
  event: (ctx: Context, expr: unknown): unknown =>
    expressionInterpreter.event(withParity(ctx), expr),
  handler: (ctx: Context, expr: unknown): unknown =>
    expressionInterpreter.handler(withParity(ctx), expr),
  encode: (ctx: Context, encode: unknown): unknown =>
    expressionInterpreter.encode(withParity(ctx), encode),
};
