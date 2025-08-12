/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { TooltipSelector } from './tooltip_selector';
import { AbstractField } from '../../classes/fields/field';
import { FIELD_ORIGIN } from '../../../common/constants';

class MockField extends AbstractField {
  private _label?: string;
  constructor({ name, label }: { name: string; label?: string }) {
    super({ fieldName: name, origin: FIELD_ORIGIN.SOURCE });
    this._label = label;
  }

  async getLabel() {
    return this._label || 'foobar_label';
  }
}

const defaultProps = {
  tooltipFields: [new MockField({ name: 'iso2' })],
  onChange: () => {},
  fields: [
    new MockField({
      name: 'iso2',
      label: 'ISO 3166-1 alpha-2 code',
    }),
    new MockField({
      name: 'iso3',
    }),
  ],
};

describe('TooltipSelector', () => {
  test('should render component', async () => {
    render(
      <I18nProvider>
        <TooltipSelector {...defaultProps} />
      </I18nProvider>
    );

    // Wait for async field labels to load and verify the component rendered
    await waitFor(() => {
      // Verify the field label is displayed
      expect(screen.getByText('ISO 3166-1 alpha-2 code')).toBeInTheDocument();
    });

    // Verify drag and drop container is rendered
    const container = document.querySelector('[data-rfd-droppable-id="mapLayerTOC"]');
    expect(container).toBeInTheDocument();
    
    // Verify the draggable field item is rendered
    const draggableItem = document.querySelector('[data-rfd-draggable-id="iso2"]');
    expect(draggableItem).toBeInTheDocument();
    
    // Verify the Add button is rendered
    expect(screen.getByText('Add')).toBeInTheDocument();
    
    // Verify remove and reorder buttons are present
    expect(screen.getByLabelText('Remove property')).toBeInTheDocument();
    expect(screen.getByLabelText('Reorder property')).toBeInTheDocument();
  });
});
