/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { JestContext } from '../../test/context_jest';
import { Scrubber } from './scrubber';

jest.mock('../../supported_renderers');

describe('<Scrubber />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<Scrubber />);
    expect(container.firstChild).toBeNull();
  });

  test('renders as expected', () => {
    render(
      <JestContext>
        <Scrubber />
      </JestContext>
    );

    // Check that the slide container is rendered
    const slideContainer = document.querySelector('.slideContainer');
    expect(slideContainer).toBeInTheDocument();
    expect(slideContainer?.children).toHaveLength(1);

    // Check that the rendered element contains the expected mock text
    expect(screen.getByText('markdown mock')).toBeInTheDocument();
  });
});
