/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { DeprecationTableColumns } from '../../../types';
import { mockDefaultDeprecation } from '../../__fixtures__/es_deprecations';
import { DefaultTableRow } from './table_row';

const mockAddContent = jest.fn<void, [params: { id: string }]>();
const mockRemoveContent = jest.fn<void, [id: string]>();

jest.mock('../../../../../shared_imports', () => {
  const actual = jest.requireActual('../../../../../shared_imports');

  return {
    ...actual,
    GlobalFlyout: {
      ...actual.GlobalFlyout,
      useGlobalFlyout: () => ({
        addContent: (...args: Parameters<typeof mockAddContent>) => mockAddContent(...args),
        removeContent: (...args: Parameters<typeof mockRemoveContent>) =>
          mockRemoveContent(...args),
      }),
    },
  };
});

describe('DefaultTableRow', () => {
  const rowFieldNames: DeprecationTableColumns[] = ['message', 'actions'];

  beforeEach(() => {
    mockAddContent.mockClear();
    mockRemoveContent.mockClear();
  });

  it('opens flyout when action icon is clicked', async () => {
    renderWithI18n(
      <table>
        <tbody>
          <DefaultTableRow
            deprecation={mockDefaultDeprecation}
            rowFieldNames={rowFieldNames}
            index={0}
          />
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByTestId('deprecation-default'));

    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    expect(mockAddContent.mock.calls[0][0].id).toBe('deprecationDetails');
  });
});
