/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { keyBy } from 'lodash';
import pLimit from 'p-limit';
import { readdir, readFile } from 'fs/promises';

export interface EsqlDocEntry {
  keyword: string;
  data: string;
}

export interface EsqlDocData {
  systemMessage: string;
  docs: Record<string, EsqlDocEntry>;
}

export const loadData = async (): Promise<EsqlDocData> => {
  const [systemMessage, docs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);
  return {
    systemMessage,
    docs,
  };
};

const loadSystemMessage = async () => {
  return (await readFile(Path.join(__dirname, '../system_message.txt'))).toString('utf-8');
};

const loadEsqlDocs = async (): Promise<Record<string, EsqlDocEntry>> => {
  const dir = Path.join(__dirname, '../esql_docs');
  const files = (await readdir(dir)).filter((file) => Path.extname(file) === '.txt');

  const limiter = pLimit(10);

  return keyBy(
    await Promise.all(
      files.map((file) =>
        limiter(async () => {
          const data = (await readFile(Path.join(dir, file))).toString('utf-8');
          const filename = Path.basename(file, '.txt');

          const keyword = filename.replace('esql-', '').replaceAll('-', '_').toUpperCase();

          return {
            keyword,
            data,
          };
        })
      )
    ),
    'keyword'
  );
};
