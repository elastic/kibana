/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { HelloWorld } from '.';

describe('HelloWorld', () => {
  it('renders the hello world text', () => {
    const { getByTestId } = render(<HelloWorld />);
    const helloWorldText = getByTestId('helloWorld');

    expect(helloWorldText).toBeInTheDocument();
  });
});
