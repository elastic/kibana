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
import { mockClusterSettingDeprecation } from '../../__fixtures__/es_deprecations';
import { RemoveClusterSettingsFlyout } from './flyout';

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

describe('RemoveClusterSettingsFlyout', () => {
  const closeFlyout = jest.fn();
  const removeClusterSettings = jest.fn<Promise<void>, [settings: string[]]>();

  beforeEach(() => {
    closeFlyout.mockClear();
    removeClusterSettings.mockClear();
  });

  it('renders deprecation details and prompt', () => {
    renderWithI18n(
      <RemoveClusterSettingsFlyout
        deprecation={mockClusterSettingDeprecation}
        closeFlyout={closeFlyout}
        removeClusterSettings={removeClusterSettings}
        status={{ statusType: 'idle' }}
      />
    );

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(
      mockClusterSettingDeprecation.message
    );
    expect(screen.getByTestId('flyoutBody')).toHaveTextContent(
      mockClusterSettingDeprecation.details
    );
    expect(screen.getByTestId('documentationLink')).toHaveAttribute(
      'href',
      mockClusterSettingDeprecation.url
    );
    expect(screen.getByTestId('removeClusterSettingsPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('deleteClusterSettingsButton')).toHaveTextContent(
      'Remove deprecated settings'
    );
  });

  it('calls removeClusterSettings with deprecated settings', () => {
    renderWithI18n(
      <RemoveClusterSettingsFlyout
        deprecation={mockClusterSettingDeprecation}
        closeFlyout={closeFlyout}
        removeClusterSettings={removeClusterSettings}
        status={{ statusType: 'idle' }}
      />
    );

    fireEvent.click(screen.getByTestId('deleteClusterSettingsButton'));
    expect(removeClusterSettings).toHaveBeenCalledWith([
      'cluster.routing.allocation.require._tier',
    ]);
  });

  it('hides prompt and action button when resolved', () => {
    renderWithI18n(
      <RemoveClusterSettingsFlyout
        deprecation={mockClusterSettingDeprecation}
        closeFlyout={closeFlyout}
        removeClusterSettings={removeClusterSettings}
        status={{ statusType: 'complete' }}
      />
    );

    expect(screen.queryByTestId('removeClusterSettingsPrompt')).toBeNull();
    expect(screen.queryByTestId('deleteClusterSettingsButton')).toBeNull();
    expect(screen.getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
  });

  it('shows error callout and changes button label on failure', () => {
    const error: ResponseError = {
      statusCode: 500,
      message: 'Remove cluster settings error',
    };

    renderWithI18n(
      <RemoveClusterSettingsFlyout
        deprecation={mockClusterSettingDeprecation}
        closeFlyout={closeFlyout}
        removeClusterSettings={removeClusterSettings}
        status={{ statusType: 'error', details: error }}
      />
    );

    expect(screen.getByTestId('deleteClusterSettingsError')).toHaveTextContent(
      'Error deleting cluster settings'
    );
    expect(screen.getByTestId('deleteClusterSettingsError')).toHaveTextContent(
      'Remove cluster settings error'
    );
    expect(screen.getByTestId('deleteClusterSettingsButton')).toHaveTextContent(
      'Retry removing deprecated settings'
    );
  });
});
