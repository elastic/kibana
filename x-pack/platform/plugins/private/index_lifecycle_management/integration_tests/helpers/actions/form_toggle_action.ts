/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';

export const createFormToggleAction = (dataTestSubject: string) => () => {
  // Handle potential duplicates by getting all matches and clicking the first one
  const switchElements = screen.getAllByTestId(dataTestSubject);
  fireEvent.click(switchElements[0]);
};
