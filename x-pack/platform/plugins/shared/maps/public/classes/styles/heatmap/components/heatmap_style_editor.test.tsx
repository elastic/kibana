/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { HeatmapStyleEditor } from './heatmap_style_editor';

describe('HeatmapStyleEditor', () => {
  test('is rendered', () => {
    const mockOnHeatmapColorChange = jest.fn();
    
    render(
      <I18nProvider>
        <HeatmapStyleEditor 
          colorRampName="Blues" 
          onHeatmapColorChange={mockOnHeatmapColorChange} 
        />
      </I18nProvider>
    );

    // Verify the form row label is present
    expect(screen.getByText('Color range')).toBeInTheDocument();
    
    // Verify the form row structure is present
    const formRow = screen.getByText('Color range').closest('.euiFormRow');
    expect(formRow).toBeInTheDocument();
    
    // Verify the color palette selector button is present (SuperSelect control)
    const selectorButton = screen.getByRole('button', { name: /Color range/i });
    expect(selectorButton).toBeInTheDocument();
    expect(selectorButton).toHaveClass('euiSuperSelectControl');
    
    // Verify the color palette display element is present
    const colorDisplay = formRow?.querySelector('.euiColorPaletteDisplay');
    expect(colorDisplay).toBeInTheDocument();
    
    // Verify the dropdown arrow icon is present
    const arrowIcon = formRow?.querySelector('[data-euiicon-type="arrowDown"]');
    expect(arrowIcon).toBeInTheDocument();
  });
});
