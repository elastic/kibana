/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import type { Phase } from '../../../common/types';

export const createReadonlyActions = (phase: Phase) => {
  const toggleSelector = `${phase}-readonlySwitch`;
  return {
    readonlyExists: () => Boolean(screen.queryByTestId(toggleSelector)),
    toggleReadonly: () => fireEvent.click(screen.getByTestId(toggleSelector)),
  };
};
