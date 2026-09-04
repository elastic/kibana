/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { OpenLensButton } from './open_lens_button';
import { lensVisualization } from './index.mock';
import userEvent from '@testing-library/user-event';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { renderWithTestingProviders } from '../../../common/mock';

describe('OpenLensButton', () => {
  const props = {
    savedObjectId: 'test',
    ...lensVisualization,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button correctly', () => {
    const services = createStartServicesMock();
    services.lens.canUseEditor = () => true;

    const navigateToPrefilledEditor = jest.fn();
    services.lens.navigateToPrefilledEditor = navigateToPrefilledEditor;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<OpenLensButton {...props} />, {
      wrapperProps: { services },
    });

    expect(screen.getByText('Open visualization')).toBeInTheDocument();
  });

  it('calls navigateToPrefilledEditor correctly', async () => {
    const services = createStartServicesMock();
    services.lens.canUseEditor = () => true;

    const navigateToPrefilledEditor = jest.fn();
    services.lens.navigateToPrefilledEditor = navigateToPrefilledEditor;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<OpenLensButton {...props} />, {
      wrapperProps: { services },
    });

    await userEvent.click(screen.getByTestId('cases-open-in-visualization-btn'));

    const { timeRange, ...rest } = lensVisualization;

    expect(navigateToPrefilledEditor).toHaveBeenCalledWith(
      {
        id: props.savedObjectId,
        ...rest,
        time_range: timeRange,
      },
      { openInNewTab: true }
    );
  });
});
