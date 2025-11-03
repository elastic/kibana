/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fromByteArray } from 'base64-js';
import type { CreateDocsResponse, ImportDocTika } from './file_reader_base';
import { FileReaderBase } from './file_reader_base';

export class TikaReader extends FileReaderBase {
  public read(data: ArrayBuffer) {
    let docArray: ImportDocTika[] = [];
    const pdfBase64 = fromByteArray(new Uint8Array(data));
    const { success, docs } = this._createDocs(pdfBase64);
    if (success) {
      docArray = docArray.concat(docs);
    } else {
      throw new Error(`Failed to create docs from TikaReader`);
    }
    return docArray;
  }

  protected _createDocs(base64String: string): CreateDocsResponse<ImportDocTika> {
    const remainder = 0;
    try {
      const docs = [{ data: base64String }];
      return {
        success: true,
        docs,
        remainder,
      };
    } catch (error) {
      return {
        success: false,
        docs: [],
        remainder,
        error,
      };
    }
  }
}
