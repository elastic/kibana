/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { readConfig } from './create_config';

describe('readConfig', () => {
  it('parses the full example config without errors', async () => {
    const fullExamplePath = path.join(__dirname, '../../example_config/full_example.yaml');
    const config = await readConfig(fullExamplePath);

    expect(config.schedule).toBeDefined();
    expect(config.schedule![0].start).toBe('now-1h');
    expect(config.schedule![2].end).toBe(false);
  });

  it('parses unquoted ISO dates as strings, not Date objects', async () => {
    // js-yaml's default schema coerces unquoted ISO dates (e.g. 2024-12-31) to JS Date
    // objects. The yaml package's YAML 1.2 core schema correctly yields a string, which
    // allows io-ts rt.string validation to succeed.
    const fixturePath = path.join(__dirname, '__fixtures__/unquoted_date.yaml');
    const config = await readConfig(fixturePath);

    expect(config.schedule).toBeDefined();
    expect(typeof config.schedule![0].start).toBe('string');
    expect(config.schedule![0].start).toBe('2024-12-31');
  });
});
