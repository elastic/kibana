/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pathToFileURL } from 'url';
import { resolveLocalArtifactsPath } from './local_artifacts';

describe('resolveLocalArtifactsPath', () => {
  it('returns the path of a file URL', () => {
    expect(resolveLocalArtifactsPath(new URL('file:///opt/kibana/bundled_artifacts'))).toBe(
      '/opt/kibana/bundled_artifacts'
    );
  });

  it('decodes percent-encoded characters produced by pathToFileURL', () => {
    const path = '/Users/some user/kibana/target/bundled artifacts';

    expect(resolveLocalArtifactsPath(pathToFileURL(path))).toBe(path);
  });

  it('rejects non-file URLs', () => {
    expect(() => resolveLocalArtifactsPath(new URL('https://example.com/index.xml'))).toThrow(
      'Expected file URL, got https:'
    );
  });
});
