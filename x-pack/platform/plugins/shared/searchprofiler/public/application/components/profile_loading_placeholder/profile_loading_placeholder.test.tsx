/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { ProfileLoadingPlaceholder } from '.';

describe('Profile Loading Placeholder', () => {
  it('renders', async () => {
    const init = registerTestBed(ProfileLoadingPlaceholder);
    await init();
  });
});
