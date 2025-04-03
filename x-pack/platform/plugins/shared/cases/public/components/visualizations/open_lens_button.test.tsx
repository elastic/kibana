/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import React from 'react';
import { screen } from '@testing-library/react';

import { OpenLensButton } from './open_lens_button';
import { lensVisualization } from './index.mock';
import userEvent from '@testing-library/user-event';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { renderWithTestingProviders } from '../../common/mock';

describe('OpenLensButton', () => {
  const props = {
    attachmentId: 'test',
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

    expect(navigateToPrefilledEditor).toBeCalledWith(
      {
        id: props.attachmentId,
        ...lensVisualization,
      },
      { openInNewTab: true }
    );
  });

  it('returns null if the user does not have access to lens', () => {
    const services = createStartServicesMock();
    services.lens.canUseEditor = () => false;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<OpenLensButton {...props} />, {
      wrapperProps: { services },
    });

    expect(screen.queryByText('Open visualization')).not.toBeInTheDocument();
  });

  it('does not show the button if the query is an ESQL', () => {
    const esqlProps = {
      attachmentId: 'test',
      ...lensVisualization,
    };

    set(esqlProps, 'attributes.state.query', { esql: '' });

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<OpenLensButton {...esqlProps} />);

    expect(screen.queryByText('Open visualization')).not.toBeInTheDocument();
  });
});
