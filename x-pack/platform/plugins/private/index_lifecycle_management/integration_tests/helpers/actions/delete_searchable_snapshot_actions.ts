/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { createFormToggleAction } from './form_toggle_action';

export const createDeleteSearchableSnapshotActions = (testBed: TestBed) => {
  const toggleSelector = `deleteSearchableSnapshotSwitch`;
  return {
    toggleDeleteSearchableSnapshot: createFormToggleAction(testBed, toggleSelector),
  };
};
