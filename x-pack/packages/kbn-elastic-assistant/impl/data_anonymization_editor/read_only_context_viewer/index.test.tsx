/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../content/prompts/system/translations';
import { ReadOnlyContextViewer, Props } from '.';

const defaultProps: Props = {
  rawData: 'this content is NOT anonymized',
};

describe('ReadOnlyContextViewer', () => {
  it('renders the context with the correct formatting', () => {
    render(<ReadOnlyContextViewer {...defaultProps} />);

    const contextBlock = screen.getByTestId('readOnlyContextViewer');

    expect(contextBlock.textContent).toBe(SYSTEM_PROMPT_CONTEXT_NON_I18N(defaultProps.rawData));
  });
});
