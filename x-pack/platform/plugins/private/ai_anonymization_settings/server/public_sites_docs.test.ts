/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { PUBLIC_HOSTS, PUBLIC_SERVICE_DOMAINS } from '@kbn/ai-anonymization-common';

// The built-in host rule leaves these sites readable. A customer whose own domain is on the list
// would never be masked, so every entry must be documented where an admin can find it.
describe('README list of public sites left unmasked', () => {
  const readme = Fs.readFileSync(Path.join(__dirname, '..', 'README.md'), 'utf8');

  it.each([...PUBLIC_SERVICE_DOMAINS, ...PUBLIC_HOSTS])('lists %s', (site) => {
    expect(readme).toContain(`\`${site}\``);
  });
});
