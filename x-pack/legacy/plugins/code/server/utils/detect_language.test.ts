/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { detectLanguageByFilename } from './detect_language';

test('detect file types', () => {
  expect(detectLanguageByFilename('a.h')).toEqual('c');
  expect(detectLanguageByFilename('a.c')).toEqual('c');
  expect(detectLanguageByFilename('a.cc')).toEqual('cpp');
  expect(detectLanguageByFilename('a.m')).toEqual('objective-c');
  expect(detectLanguageByFilename('a.ts')).toEqual('typescript');
  expect(detectLanguageByFilename('a.java')).toEqual('java');
});
