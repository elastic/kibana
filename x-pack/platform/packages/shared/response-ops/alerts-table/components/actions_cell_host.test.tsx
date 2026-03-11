/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useEffect } from 'react';
import { screen, render } from '@testing-library/react';
import { ActionsCellHost } from './actions_cell_host';
import { createPartialObjectMock } from '../utils/test';
import { mockRenderContext } from '../mocks/context.mock';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const props = createPartialObjectMock<ComponentProps<typeof ActionsCellHost>>({
  ...mockRenderContext,
  rowIndex: 0,
});

describe('ActionsCellHost', () => {
  it('should render the provided custom actions cell', () => {
    render(
      <ActionsCellHost
        {...props}
        renderActionsCell={jest.fn(() => (
          <div data-test-subj="renderActionsCell" />
        ))}
      />
    );
    expect(screen.getByTestId('renderActionsCell')).toBeInTheDocument();
  });

  it('should catch errors from the custom actions cell', async () => {
    const CustomActionsCell = () => {
      useEffect(() => {
        throw new Error('test error');
      }, []);
      return null;
    };
    render(
      <IntlProvider locale="en">
        <ActionsCellHost {...props} renderActionsCell={CustomActionsCell} />
      </IntlProvider>
    );
    expect(await screen.findByTestId('errorCell')).toBeInTheDocument();
  });
});
