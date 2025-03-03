/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GenerationError } from './generation_error';

describe('GenerationError', () => {
  it('should render error', () => {
    const title = 'testErrorTitle';
    const errorMessage = 'testErrorMessage';
    const retryAction = () => {};

    const { getByText } = render(
      <GenerationError title={title} error={errorMessage} retryAction={retryAction} />
    );
    const errorElement = getByText('testErrorTitle');
    expect(errorElement).toBeInTheDocument();
  });
});
