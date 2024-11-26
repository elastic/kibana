/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArtifactContentFilePath } from './artifact_content';

describe('isArtifactContentFilePath', () => {
  it('returns true for filenames matching the pattern', () => {
    expect(isArtifactContentFilePath('content/content-0.ndjson')).toEqual(true);
    expect(isArtifactContentFilePath('content/content-007.ndjson')).toEqual(true);
    expect(isArtifactContentFilePath('content/content-9042.ndjson')).toEqual(true);
  });

  it('returns false for filenames not matching the pattern', () => {
    expect(isArtifactContentFilePath('content-0.ndjson')).toEqual(false);
    expect(isArtifactContentFilePath('content/content-0')).toEqual(false);
    expect(isArtifactContentFilePath('content/content.ndjson')).toEqual(false);
    expect(isArtifactContentFilePath('content/content-9042.json')).toEqual(false);
  });
});
