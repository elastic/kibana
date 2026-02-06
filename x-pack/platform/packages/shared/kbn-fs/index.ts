/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  writeFile,
  writeFileSync,
  appendFile,
  appendFileSync,
  createWriteStream,
  readFile,
  readFileSync,
  createReadStream,
  deleteFile,
  deleteFileSync,
} from './lib';

export { sanitizeSvg } from './sanitizations/svg';
export { getSafePath } from './utils';
