/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import { getAnonymizationUiSettings } from './ui_settings';

describe('ai:anonymizationSettings in the Advanced Settings reference', () => {
  it('shows the default configuration the setting ships with', () => {
    // The reference copies the default (built-in rules and their regular expressions) by hand, so it
    // goes stale whenever a built-in pattern changes. To update it, paste the output of
    // `JSON.stringify(<setting>.value, null, 2)` into the entry's "Default configuration" block.
    const docs = Fs.readFileSync(
      Path.join(REPO_ROOT, 'docs', 'reference', 'advanced-settings-space.yml'),
      'utf8'
    );
    const entry = docs.slice(docs.indexOf(`setting: "${aiAnonymizationSettings}"`));
    const documentedDefault = /```json\n([\s\S]*?)\n\s*```/.exec(entry)?.[1];
    const shippedDefault = getAnonymizationUiSettings()[aiAnonymizationSettings].value;

    expect(documentedDefault).toBeDefined();
    expect(JSON.parse(documentedDefault as string)).toEqual(JSON.parse(String(shippedDefault)));
  });
});
