/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import { ConvertToEsqlModal, type Layer } from './convert_to_esql_modal';
import userEvent from '@testing-library/user-event';

const mockLayers: Layer[] = [
  {
    id: '1',
    icon: 'layers',
    name: 'Layer 1',
    typology: 'Visualization',
    query: `FROM datacommerce
      | WHERE order_status == "completed"
      | STATS avg_order_value = AVG(order_total) BY customer_region
      | SORT avg_order_value DESC`,
    isConvertibleToEsql: true,
  },
  {
    id: '2',
    icon: 'layers',
    name: 'Layer 2',
    typology: 'Visualization',
    query: `FROM datacommerce
      | STATS total_sales = SUM(sales_amount) BY product_category
      | SORT total_sales DESC
      | LIMIT 5`,
    isConvertibleToEsql: true,
  },
  {
    id: '3',
    icon: 'annotation',
    name: 'Layer 3',
    typology: 'Annotation',
    query: '',
    isConvertibleToEsql: false,
  },
];

const mockOnCancel = jest.fn();
const mockOnConfirm = jest.fn();

const renderComponent = (
  propsOverrides?: Partial<React.ComponentProps<typeof ConvertToEsqlModal>>
) => {
  return render(
    <ConvertToEsqlModal
      layers={mockLayers}
      onCancel={mockOnCancel}
      onConfirm={mockOnConfirm}
      {...propsOverrides}
    />
  );
};

describe('ConvertToEsqlModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('single layer', () => {
    it('renders query preview and does not render a table', async () => {
      renderComponent({ layers: [mockLayers[0]] });

      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      expect(screen.getByText('Query preview')).toBeInTheDocument();
      expect(screen.getByText(/FROM datacommerce/)).toBeInTheDocument();
    });

    it('calls onConfirm whith the layer ID', async () => {
      renderComponent({ layers: [mockLayers[0]] });

      await userEvent.click(screen.getByRole('button', { name: /switch to query mode/i }));

      expect(mockOnConfirm).toHaveBeenCalledWith({
        layersToConvert: ['1'],
      });
    });
  });

  describe('multiple layers', () => {
    it('renders table with all layers', () => {
      renderComponent();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Layer 1')).toBeInTheDocument();
      expect(screen.getByText('Layer 2')).toBeInTheDocument();
      expect(screen.getByText('Layer 3')).toBeInTheDocument();
    });

    it('disables selection for non-convertible layers', () => {
      renderComponent();

      const checkbox = screen.getByTestId('checkboxSelectRow-3'); // Layer 3 (annotation)
      expect(checkbox).toBeDisabled();
    });

    it('expands row to show query when expand button is clicked', async () => {
      renderComponent();

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      expect(screen.getAllByText(/FROM datacommerce/)[0]).toBeInTheDocument();
    });

    it('collapses row when collapse button is clicked', async () => {
      renderComponent();

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await userEvent.click(collapseButton);

      const codeBlocks = screen.queryAllByText(/FROM datacommerce/); // improve this
      expect(codeBlocks).toHaveLength(0);
    });

    it('disables expand button for non-convertible layers', () => {
      renderComponent();

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      expect(expandButtons[2]).toBeDisabled(); // Layer 3 expand button
    });

    it('allows selecting multiple convertible layers', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('checkboxSelectRow-1'));
      await userEvent.click(screen.getByTestId('checkboxSelectRow-2'));

      await userEvent.click(screen.getByRole('button', { name: /switch to query mode/i }));

      expect(mockOnConfirm).toHaveBeenCalledWith({
        layersToConvert: ['1', '2'],
      });
    });

    it('disables confirm button when no layers are selected', () => {
      renderComponent();

      const confirmButton = screen.getByRole('button', { name: /switch to query mode/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    renderComponent();

    await userEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
