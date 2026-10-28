/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContentHash } from './content_hash';
import { assertDefinitionYamlHash } from './definition_integrity';

const yaml = 'id: .abuseipdb\n';
const hash = getContentHash(yaml);

describe('assertDefinitionYamlHash', () => {
  const definition = {
    id: '.abuseipdb',
    version: '1.0',
    yaml,
    contentHash: hash,
  };

  it('passes when the stored yaml matches the stored hash', () => {
    expect(() => assertDefinitionYamlHash(definition)).not.toThrow();
  });

  it('prefers the manifest row hash', () => {
    const rowHash = `sha256:${'b'.repeat(64)}`;
    expect(() =>
      assertDefinitionYamlHash(definition, [
        { id: '.abuseipdb', version: '1.0', contentHash: rowHash },
      ])
    ).toThrow(rowHash);
  });

  it('throws both hashes when the yaml does not match', () => {
    expect(() => assertDefinitionYamlHash({ ...definition, yaml: `${yaml}# changed\n` })).toThrow(
      /definition:\.abuseipdb@1\.0/
    );
  });
});
