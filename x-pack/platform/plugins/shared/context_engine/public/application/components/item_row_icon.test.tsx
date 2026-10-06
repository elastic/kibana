/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';
import React from 'react';
import { ITEM_ROW_ICON_SIZE, ItemRowIcon } from './item_row_icon';

const renderIcon = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('ItemRowIcon', () => {
  it('renders the icon type at the shared item row size', () => {
    expect(ITEM_ROW_ICON_SIZE).toBe('l');

    const { container } = renderIcon(<ItemRowIcon iconType="code" />);

    expect(container.querySelector('[data-euiicon-type="code"]')).toBeInTheDocument();
  });
});
