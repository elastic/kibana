/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SETUP_WIZARD_CLOSED } from '../../../../utils/setup_wizard_storage';
import { SETUP_WIZARD_STEPS } from '.';

describe('SETUP_WIZARD_STEPS', () => {
  // Local storage, EBT and test subjects tell the steps apart by id.
  it('has unique step ids, none equal to the stored "closed" value', () => {
    const ids = SETUP_WIZARD_STEPS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(SETUP_WIZARD_CLOSED);
  });
});
