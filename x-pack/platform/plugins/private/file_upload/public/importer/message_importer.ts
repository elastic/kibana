/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageReader } from '@kbn/file-upload-common';
import { Importer } from './importer';
import type { ImportFactoryOptions } from './types';

export class MessageImporter extends Importer {
  protected _reader: MessageReader;

  constructor(options: ImportFactoryOptions) {
    super();
    this._reader = new MessageReader(options);
  }
}
