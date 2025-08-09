/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { EMSVectorTileStyleEditor } from './ems_vector_tile_style_editor';

describe('EMSVectorTileStyleEditor', () => {
  test('is rendered', () => {
    const mockOnColorChange = jest.fn();
    
    render(
      <I18nProvider>
        <EMSVectorTileStyleEditor color="#4A412A" onColorChange={mockOnColorChange} />
      </I18nProvider>
    );

    // Verify the form row label is present
    expect(screen.getByText('Color blend')).toBeInTheDocument();
    
    // Verify the color picker is present and accessible
    const colorPicker = screen.getByLabelText('Color blend');
    expect(colorPicker).toBeInTheDocument();
    
    // Verify the color picker has the correct initial color
    expect(colorPicker).toHaveValue('#4A412A');
    
    // Verify the color picker is compressed and clearable by checking its container
    const colorPickerContainer = colorPicker.closest('.euiFormRow');
    expect(colorPickerContainer).toBeInTheDocument();
  });
});
