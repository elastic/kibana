/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedCodeEditor } from '@kbn/code-editor-mock';

type AnyRecord = Record<string, unknown>;
const actual = jest.requireActual('@kbn/code-editor') as AnyRecord;

module.exports = {
  ...actual,
  CodeEditor: MockedCodeEditor,
};
