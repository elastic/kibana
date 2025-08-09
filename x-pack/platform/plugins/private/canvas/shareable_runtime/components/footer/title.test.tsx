/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { JestContext } from '../../test/context_jest';
import { Title } from './title';

jest.mock('../../supported_renderers');

describe('<Title />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<Title />);
    expect(container.firstChild).toBeNull();
  });

  test('renders as expected', () => {
    render(
      <JestContext>
        <Title />
      </JestContext>
    );

    expect(screen.getByText('My Canvas Workpad')).toBeInTheDocument();
  });
});
