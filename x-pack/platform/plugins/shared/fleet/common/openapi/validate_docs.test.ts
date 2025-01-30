/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';

// Validate the entrypoint.yaml file, so the generated bundle will be correct.
// https://github.com/APIDevTools/swagger-parser

const validateDocs = async (entrypointFile: string) => {
  try {
    await SwaggerParser.validate(entrypointFile, {
      // For some reason, the internal resolver in the new version has a hard time identifying local files
      resolve: { file: { canRead: true } },
    });
    return 'Entrypoint is valid';
  } catch (err) {
    return err;
  }
};

describe('openApi', () => {
  it('Checks that entrypoint.yaml is valid', async () => {
    expect(await validateDocs(`file://${resolve(__dirname, 'entrypoint.yaml')}`)).toEqual(
      'Entrypoint is valid'
    );
  });
});
