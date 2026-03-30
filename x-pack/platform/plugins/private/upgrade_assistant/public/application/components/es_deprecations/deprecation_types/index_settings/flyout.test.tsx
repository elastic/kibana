/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ResponseError } from '../../../../../../common/types';
import { mockIndexSettingDeprecation } from '../../__fixtures__/es_deprecations';
import { RemoveIndexSettingsFlyout } from './flyout';

jest.mock('../../../../lib/ui_metric', () => {
  const actual = jest.requireActual('../../../../lib/ui_metric');

  return {
    ...actual,
    uiMetricService: {
      ...actual.uiMetricService,
      trackUiMetric: jest.fn(),
    },
  };
});

describe('RemoveIndexSettingsFlyout', () => {
  const closeFlyout = jest.fn();
  const removeIndexSettings = jest.fn<Promise<void>, [index: string, settings: string[]]>();

  beforeEach(() => {
    closeFlyout.mockClear();
    removeIndexSettings.mockClear();
  });

  it('renders deprecation details and prompt', () => {
    renderWithI18n(
      <RemoveIndexSettingsFlyout
        deprecation={mockIndexSettingDeprecation}
        closeFlyout={closeFlyout}
        removeIndexSettings={removeIndexSettings}
        status={{ statusType: 'idle' }}
      />
    );

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(
      mockIndexSettingDeprecation.message
    );
    expect(screen.getByTestId('documentationLink')).toHaveAttribute(
      'href',
      mockIndexSettingDeprecation.url
    );
    expect(screen.getByTestId('removeSettingsPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('deleteSettingsButton')).toHaveTextContent(
      'Remove deprecated settings'
    );
  });

  it('calls removeIndexSettings with index and settings', () => {
    renderWithI18n(
      <RemoveIndexSettingsFlyout
        deprecation={mockIndexSettingDeprecation}
        closeFlyout={closeFlyout}
        removeIndexSettings={removeIndexSettings}
        status={{ statusType: 'idle' }}
      />
    );

    fireEvent.click(screen.getByTestId('deleteSettingsButton'));
    expect(removeIndexSettings).toHaveBeenCalledWith('my_index', [
      'index.routing.allocation.include._tier',
    ]);
  });

  it('hides prompt and action button when resolved', () => {
    renderWithI18n(
      <RemoveIndexSettingsFlyout
        deprecation={mockIndexSettingDeprecation}
        closeFlyout={closeFlyout}
        removeIndexSettings={removeIndexSettings}
        status={{ statusType: 'complete' }}
      />
    );

    expect(screen.queryByTestId('removeSettingsPrompt')).toBeNull();
    expect(screen.queryByTestId('deleteSettingsButton')).toBeNull();
    expect(screen.getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
  });

  it('shows error callout and changes button label on failure', () => {
    const error: ResponseError = {
      statusCode: 500,
      message: 'Remove index settings error',
    };

    renderWithI18n(
      <RemoveIndexSettingsFlyout
        deprecation={mockIndexSettingDeprecation}
        closeFlyout={closeFlyout}
        removeIndexSettings={removeIndexSettings}
        status={{ statusType: 'error', details: error }}
      />
    );

    expect(screen.getByTestId('deleteSettingsError')).toHaveTextContent(
      'Error deleting index settings'
    );
    expect(screen.getByTestId('deleteSettingsError')).toHaveTextContent(
      'Remove index settings error'
    );
    expect(screen.getByTestId('deleteSettingsButton')).toHaveTextContent(
      'Retry removing deprecated settings'
    );
  });
});
