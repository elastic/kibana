/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import { Logger } from '@kbn/logging';
import './wasm/wasm_exec';

declare global {
  let formatCelProgram: (input: string) => { Format: string; Err?: string };
  let stopFormatCelProgram: () => void;
}

const wasmPath = path.join(__dirname, 'wasm');
const file = fs.readFileSync(path.join(wasmPath, 'celformat.wasm'));
let wasm: WebAssembly.Instance;

export async function validate(logger: Logger, input: string): Promise<string> {
  // @ts-expect-error
  const goWasm = new Go();
  let value;
  try {
    logger.info(`Before loading WASM ${JSON.stringify(process.memoryUsage())}`);
    const result = await WebAssembly.instantiate(file, goWasm.importObject);
    wasm = result.instance;
    goWasm.run(wasm);
    logger.info(`WASM loaded ${JSON.stringify(process.memoryUsage())}`);

    // @ts-expect-error
    value = global.formatCelProgram(input);

    logger.info(`Run function  ${JSON.stringify(process.memoryUsage())}`);

    if (value === undefined) {
      throw new Error('Failed to format CEL program');
    }
    if (value.Err) {
      // Parse Error of the CEL program
      throw new Error(value.Err);
    }
  } finally {
    // @ts-expect-error
    global.stopFormatCelProgram();
    logger.info(`Stop Main in WASM ${JSON.stringify(process.memoryUsage())}`);
  }
  return value.Format;
}
