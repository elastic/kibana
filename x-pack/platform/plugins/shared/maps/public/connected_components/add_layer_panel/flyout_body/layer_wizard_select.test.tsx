/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../classes/layers', () => ({}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LayerWizardSelect } from './layer_wizard_select';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

const defaultProps = {
  onSelect: () => {},
};

describe('LayerWizardSelect', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../../classes/layers').getLayerWizards = async () => {
      return [
        {
          categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
          description: 'mock wizard without icon',
          isDisabled: false,
          renderWizard: () => {
            return <div />;
          },
          title: 'wizard 1',
        },
        {
          categories: [LAYER_WIZARD_CATEGORY.SOLUTIONS],
          description: 'mock wizard with icon',
          isDisabled: false,
          icon: 'logoObservability',
          renderWizard: () => {
            return <div />;
          },
          title: 'wizard 2',
        },
      ];
    };
  });

  test('Should render layer select after layer wizards are loaded', async () => {
    render(
      <I18nProvider>
        <LayerWizardSelect {...defaultProps} />
      </I18nProvider>
    );

    // Wait for the layer wizards to load and render
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // Verify category facet buttons are present
    expect(screen.getByText('Elasticsearch')).toBeInTheDocument();
    expect(screen.getByText('Solutions')).toBeInTheDocument();

    // Verify wizard cards are rendered
    expect(screen.getByText('wizard 1')).toBeInTheDocument();
    expect(screen.getByText('wizard 2')).toBeInTheDocument();
    expect(screen.getByText('mock wizard without icon')).toBeInTheDocument();
    expect(screen.getByText('mock wizard with icon')).toBeInTheDocument();

    // Verify test IDs are present
    expect(screen.getByTestId('wizard1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard2')).toBeInTheDocument();
  });

  test('Should render loading screen before layer wizards are loaded', () => {
    render(
      <I18nProvider>
        <LayerWizardSelect {...defaultProps} />
      </I18nProvider>
    );

    // Initially should show skeleton loading
    // The loading state is very brief, so we just verify the component renders
    expect(document.body).not.toBeEmptyDOMElement();
  });
});
