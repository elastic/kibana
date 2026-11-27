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

const README_PATH = Path.join(
  REPO_ROOT,
  'x-pack',
  'platform',
  'plugins',
  'private',
  'ai_anonymization_settings',
  'README.md'
);

describe('ai:anonymizationSettings default in the Anonymization page README', () => {
  it('shows the default configuration the setting ships with', () => {
    // The README copies the default (built-in rules and their regular expressions) by hand, so it
    // goes stale whenever a built-in pattern changes. To update it, paste the registered `value`
    // into the "Default configuration" section (it is already a pretty-printed JSON string).
    const readme = Fs.readFileSync(README_PATH, 'utf8');
    const section = readme.slice(readme.indexOf('## Default configuration'));
    const documentedDefault = /```json\n([\s\S]*?)\n```/.exec(section)?.[1];
    const shippedDefault = getAnonymizationUiSettings()[aiAnonymizationSettings].value;

    expect(documentedDefault).toBeDefined();
    expect(JSON.parse(documentedDefault as string)).toEqual(JSON.parse(String(shippedDefault)));
  });
});
