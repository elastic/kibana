/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { AutomaticImportDataset } from '../src/types';

const DATASET_DATA_DIR = Path.resolve(__dirname, 'data');

/** Loads every dataset file in `data/`, sorted by file name. */
export const loadDatasets = (): AutomaticImportDataset[] =>
  Fs.readdirSync(DATASET_DATA_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map(
      (file) =>
        JSON.parse(
          Fs.readFileSync(Path.join(DATASET_DATA_DIR, file), 'utf8')
        ) as AutomaticImportDataset
    );
