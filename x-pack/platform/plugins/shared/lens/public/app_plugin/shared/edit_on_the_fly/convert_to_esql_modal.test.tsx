/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import type { ConvertibleLayer } from './esql_conversion_types';
import { ConvertToEsqlModal } from './convert_to_esql_modal';
import userEvent from '@testing-library/user-event';
import { IconChartBarAnnotations, IconChartBarReferenceLine } from '@kbn/chart-icons';
import { layerTypes } from '../../..';

const mockConversionData = {
  esAggsIdMap: {},
  partialRows: false,
};

const mockLayers: ConvertibleLayer[] = [
  {
    id: '1',
    icon: 'layers',
    name: 'Layer 1',
    type: layerTypes.DATA,
    query: `FROM datacommerce
      | WHERE order_status == "completed"
      | STATS avg_order_value = AVG(order_total) BY customer_region
      | SORT avg_order_value DESC`,
    isConvertibleToEsql: true,
    conversionData: mockConversionData,
  },
  {
    id: '2',
    icon: 'layers',
    name: 'Layer 2',
    type: layerTypes.DATA,
    query: `FROM datacommerce
      | STATS total_sales = SUM(sales_amount) BY product_category
      | SORT total_sales DESC
      | LIMIT 5`,
    isConvertibleToEsql: true,
    conversionData: mockConversionData,
  },
  {
    id: '3',
    icon: IconChartBarAnnotations,
    name: 'Layer 3',
    type: layerTypes.ANNOTATIONS,
    query: '',
    isConvertibleToEsql: false,
    conversionData: mockConversionData,
  },
  {
    id: '4',
    icon: IconChartBarReferenceLine,
    name: 'Layer 4',
    type: layerTypes.REFERENCELINE,
    query: '',
    isConvertibleToEsql: false,
    conversionData: mockConversionData,
  },
  {
    id: '5',
    icon: 'layers',
    name: 'Layer 5',
    type: layerTypes.DATA,
    query: '',
    isConvertibleToEsql: false,
    conversionData: mockConversionData,
    failureReason: 'formula_not_supported' as const,
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

    it('calls onConfirm callback', async () => {
      renderComponent({ layers: [mockLayers[0]] });

      await userEvent.click(screen.getByRole('button', { name: /convert to es\|ql/i }));

      expect(mockOnConfirm).toHaveBeenCalled();
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

    it('shows failure reason tooltip icon for non-convertible data layers', () => {
      renderComponent();

      const icon = screen.getByTestId('lnsEsqlConversionFailureReason-5');
      expect(icon).toBeInTheDocument();
      // EuiIcon jest mock renders the aria-label as text content
      expect(icon).toHaveTextContent(/Cannot convert to ES\|QL: Formula operations/);
    });

    it('summarizes which layers are converted and retained', () => {
      renderComponent({ layers: mockLayers.slice(0, 4) });

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.getAllByText('Will be converted')).toHaveLength(2);
      expect(screen.getAllByText('Will remain unchanged')).toHaveLength(2);
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

      const codeBlocks = screen.queryAllByText(/FROM datacommerce/, { selector: 'code' });
      expect(codeBlocks).toHaveLength(0);
    });

    it('shows expand buttons only for layers with an ES|QL query preview', () => {
      renderComponent();

      expect(screen.getAllByRole('button', { name: /expand/i })).toHaveLength(2);
    });

    it('converts all data layers without requiring a selection', async () => {
      renderComponent({ layers: mockLayers.slice(0, 4) });

      const confirmButton = screen.getByRole('button', { name: /convert to es\|ql/i });
      expect(confirmButton).toBeEnabled();

      await userEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables conversion when any data layer cannot be converted', () => {
      renderComponent();

      expect(screen.getByText('Cannot be converted')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /convert to es\|ql/i })).toBeDisabled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    renderComponent();

    await userEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
