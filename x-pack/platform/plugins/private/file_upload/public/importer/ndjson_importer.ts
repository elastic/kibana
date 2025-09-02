/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NdjsonReader } from '@kbn/file-upload-common';
import { Importer } from './importer';

export class NdjsonImporter extends Importer {
  protected _reader: NdjsonReader;

  constructor() {
    super();
    this._reader = new NdjsonReader();
  }
}
