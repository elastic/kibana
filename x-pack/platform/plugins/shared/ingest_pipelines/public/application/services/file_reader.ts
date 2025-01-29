/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class FileReaderService {
  public readFile(file: File, maxFileSizeBytes: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file && file.size) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.onload = (() => {
          return () => {
            const decoder = new TextDecoder();
            const data = reader.result;
            if (data === null || typeof data === 'string') {
              return reject();
            }
            const fileContents = decoder.decode(data.slice(0, maxFileSizeBytes));

            if (fileContents === '') {
              reject();
            } else {
              resolve(fileContents);
            }
          };
        })();
      } else {
        reject();
      }
    });
  }
}

export const fileReaderService = new FileReaderService();
