/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Location } from 'vscode-languageserver-types';
import { groupFiles } from './lsp_utils';

test('group files', async () => {
  const range = {
    start: { character: 0, line: 1 },
    end: { character: 0, line: 2 },
  };
  const url1 = 'https://github.com/elastic/code/blob/master/1';
  const url2 = 'https://github.com/elastic/code/blob/master/2';
  const url3 = 'https://github.com/elastic/code2/blob/master/1';
  const locs = [
    {
      uri: url1,
      range,
    },
    {
      uri: url1,
      range: {
        start: { character: 0, line: 2 },
        end: { character: 0, line: 3 },
      },
    },
    {
      uri: url2,
      range,
    },
    {
      uri: url3,
      range,
    },
  ] as Location[];
  const fakeSource = `1
  2
  3
  4
  5
  `;

  const fakeLoader = () => Promise.resolve({ content: fakeSource, lang: 'test' });
  // @ts-ignore
  const result = await groupFiles(locs, fakeLoader);
  const files = result['github.com/elastic/code'];
  expect(files.length).toBe(2);
  const file = files.find((f: any) => f.uri === url1);
  expect(file).not.toBeUndefined();
  expect(file.lineNumbers).toStrictEqual(['1', '2', '3', '4', '5', '..']);
  expect(result['github.com/elastic/code2'].length).toBe(1);
});
