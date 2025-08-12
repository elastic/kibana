/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LayerDescriptor } from '../../../../common/descriptor_types';
import { ILayer } from '../../../classes/layers/layer';
import { ISource } from '../../../classes/sources/source';
import { AttributionFormRow } from './attribution_form_row';

const defaultProps = {
  onChange: () => {},
};

test('Should render null when layer source has attribution provider', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return async () => {
        return [{ url: 'url1', label: 'label1' }];
      };
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
  } as unknown as ILayer;
  
  const { container } = render(
    <I18nProvider>
      <AttributionFormRow {...defaultProps} layer={layerMock} />
    </I18nProvider>
  );

  // When source has attribution provider, component should render nothing
  expect(container.firstChild).toBeNull();
});

test('Should render add form row when attribution not provided', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return null;
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
    getDescriptor: () => {
      return {} as unknown as LayerDescriptor;
    },
  } as unknown as ILayer;
  
  render(
    <I18nProvider>
      <AttributionFormRow {...defaultProps} layer={layerMock} />
    </I18nProvider>
  );

  // Verify Attribution legend is present
  expect(screen.getByText('Attribution')).toBeInTheDocument();
  
  // Verify Add attribution button is present
  expect(screen.getByText('Add attribution')).toBeInTheDocument();
});

test('Should render edit form row when attribution not provided', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return null;
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
    getDescriptor: () => {
      return {
        attribution: {
          url: 'url1',
          label: 'label1',
        },
      } as unknown as LayerDescriptor;
    },
  } as unknown as ILayer;
  
  render(
    <I18nProvider>
      <AttributionFormRow {...defaultProps} layer={layerMock} />
    </I18nProvider>
  );

  // Verify Attribution legend is present
  expect(screen.getByText('Attribution')).toBeInTheDocument();
  
  // Verify the attribution link is present
  expect(screen.getByText('label1')).toBeInTheDocument();
  
  // Verify Edit and Clear buttons are present
  expect(screen.getByText('Edit')).toBeInTheDocument();
  expect(screen.getByText('Clear')).toBeInTheDocument();
});
