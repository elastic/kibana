/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { FieldTypeIcon } from './field_type_icon';
import { SUPPORTED_FIELD_TYPES } from '../../../../../common/constants';

describe('FieldTypeIcon', () => {
  it('renders label and icon but not tooltip content on mouseover if tooltipEnabled=false', async () => {
    const { getByText, container } = render(
      <FieldTypeIcon type={SUPPORTED_FIELD_TYPES.KEYWORD} tooltipEnabled={false} />
    );

    expect(container.querySelector('[data-test-subj="dvFieldTypeIcon-keyword"]')).toBeDefined();

    fireEvent.mouseOver(getByText('Keyword'));

    await waitFor(
      () => {
        const tooltip = document.querySelector('[data-test-subj="dvFieldTypeTooltip"]');
        expect(tooltip).toBeNull();
      },
      { timeout: 1500 } // Account for long delay on tooltips
    );
  });

  it(`renders component when type matches a field type`, () => {
    const { container } = render(
      <FieldTypeIcon type={SUPPORTED_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />
    );

    expect(container.querySelector('[data-test-subj="dvFieldTypeIcon-keyword"]')).toBeDefined();
    expect(container).toHaveTextContent('keyword');
  });

  it('shows tooltip content on mouseover', async () => {
    const { getByText, container } = render(
      <FieldTypeIcon type={SUPPORTED_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />
    );
    expect(container.querySelector('[data-test-subj="dvFieldTypeIcon-keyword"]')).toBeDefined();
    expect(container).toHaveTextContent('keyword');

    fireEvent.mouseOver(getByText('keyword'));

    await waitFor(
      () => {
        const tooltip = document.querySelector('[data-test-subj="dvFieldTypeTooltip"]');
        expect(tooltip).toBeVisible();
        expect(tooltip?.textContent).toEqual('Keyword');
      },
      { timeout: 1500 } // Account for long delay on tooltips
    );
    fireEvent.mouseOut(getByText('keyword'));

    await waitFor(() => {
      const tooltip = document.querySelector('[data-test-subj="dvFieldTypeTooltip"]');
      expect(tooltip).toBeNull();
    });
  });
});
