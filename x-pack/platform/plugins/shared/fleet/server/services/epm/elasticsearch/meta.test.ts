/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendMetadataToIngestPipeline, getESAssetMetadata } from './meta';

describe('appendMetadataToIngestPipeline', () => {
  it('escapes DEL (U+007F) and C1 control characters that the yaml package leaves unescaped', () => {
    // The yaml package does not escape U+007F in double-quoted scalars; SnakeYAML rejects the raw byte.
    const result = appendMetadataToIngestPipeline({
      pipeline: {
        extension: 'yml',
        nameForInstallation: 'test-pipeline',
        // gsub pattern with control characters — mirrors what real Fortinet pipelines contain
        contentForInstallation: `processors:\n  - gsub:\n      field: message\n      pattern: "[\\x00-\\x1f\\x7f]"\n      replacement: ""\n`,
      },
      packageName: 'test',
    });

    expect(result.contentForInstallation).not.toMatch(/\x7f/);
    expect(result.contentForInstallation).toContain('\\x7f');
  });

  it('serializes multi-line Painless scripts as literal block scalars (source: |)', () => {
    // yaml.stringify() was producing source: > (folded block) for scripts whose lines
    // approach the default lineWidth (80 chars), which Elasticsearch's Jackson YAML parser rejects.
    const result = appendMetadataToIngestPipeline({
      pipeline: {
        extension: 'yml',
        nameForInstallation: 'test-pipeline',
        contentForInstallation: `processors:
  - script:
      lang: painless
      source: |
        def splitUnquoted(String input, String sep) {
          def tokens = [];
          def startPosition = 0;
          def isInQuotes = false;
          char quote = (char)"\\"";
          for (def currentPosition = 0; currentPosition < input.length(); currentPosition++) {
            if (input.charAt(currentPosition) == quote) {
              isInQuotes = !isInQuotes;
            }
          }
          return tokens;
        }
`,
      },
      packageName: 'test',
    });

    expect(result.contentForInstallation).toMatch(/source: \|/);
    expect(result.contentForInstallation).not.toMatch(/source: >/);
  });
});

describe('getESAssetMetadata', () => {
  describe('with package name', () => {
    it('generates expected JSON', () => {
      const packageName = 'foo';

      const meta = getESAssetMetadata({ packageName });

      expect(meta).toEqual({ managed_by: 'fleet', managed: true, package: { name: packageName } });
    });
  });

  describe('without package name', () => {
    it('generates expected JSON', () => {
      const meta = getESAssetMetadata();

      expect(meta).toEqual({ managed_by: 'fleet', managed: true });
    });
  });
});
