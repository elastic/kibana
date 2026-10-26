/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MB } from '../constants';

const STRING_CHUNKS_MB = 100;

export interface ImportDocMessage {
  message: string;
}

export interface ImportDocTika {
  data: string;
}

export type ImportDoc = ImportDocMessage | ImportDocTika | string | object;

export interface CreateDocsResponse<T extends ImportDoc> {
  success: boolean;
  remainder: number;
  docs: T[];
  error?: any;
}

export abstract class FileReaderBase {
  protected _docArray: ImportDoc[] = [];
  protected abstract _createDocs(t: string, isLastPart: boolean): CreateDocsResponse<ImportDoc>;

  public read(data: ArrayBuffer) {
    let docArray: ImportDoc[] = [];
    const decoder = new TextDecoder();
    const size = STRING_CHUNKS_MB * MB;

    // chop the data up into 100MB chunks for processing.
    // if the chop produces a partial line at the end, a character "remainder" count
    // is returned which is used to roll the next chunk back that many chars so
    // it is included in the next chunk.
    const parts = Math.ceil(data.byteLength / size);
    let remainder = 0;
    for (let i = 0; i < parts; i++) {
      const byteArray = decoder.decode(data.slice(i * size - remainder, (i + 1) * size));
      const {
        success,
        docs,
        remainder: tempRemainder,
      } = this._createDocs(byteArray, i === parts - 1);
      if (success) {
        docArray = docArray.concat(docs);
        remainder = tempRemainder;
      } else {
        throw new Error(`Failed to create docs from chunk ${i}`);
      }
    }

    return docArray;
  }
}
