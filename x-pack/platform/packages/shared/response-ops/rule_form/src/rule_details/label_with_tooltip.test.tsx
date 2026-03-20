/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { LabelWithTooltip } from './label_with_tooltip';

describe('LabelWithTooltip', () => {
  it('renders label and tooltip content', async () => {
    const { getByText } = render(
      <LabelWithTooltip labelContent="Label" tooltipContent="Tooltip" />
    );
    const infoElement = getByText('Info');

    fireEvent.mouseOver(infoElement);
    await waitFor(() => {
      expect(getByText('Tooltip')).toBeInTheDocument();
    });
    expect(getByText('Label')).toBeInTheDocument();
  });
});
