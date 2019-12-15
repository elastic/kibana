/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../../test_utils';
import { ProfileLoadingPlaceholder } from '.';

describe('Profile Loading Placeholder', () => {
  it('renders', async () => {
    const init = registerTestBed(ProfileLoadingPlaceholder);
    await init();
  });
});
