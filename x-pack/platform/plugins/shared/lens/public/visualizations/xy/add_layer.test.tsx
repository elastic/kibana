/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AddLayerButton } from './add_layer';
import type { XYVisualizationState } from './types';
import { Position } from '@elastic/charts';
import { LENS_DATASOURCE_ID, LENS_LAYER_TYPES as LayerTypes } from '@kbn/lens-common';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';
import { IconChartBarAnnotations } from '@kbn/chart-icons';

const ONE_FRAME_MS = 16;

describe('AddLayerButton', () => {
  const addLayer = jest.fn();

  const renderAddLayerButton = () => {
    const state: XYVisualizationState = {
      legend: { position: Position.Bottom, isVisible: true },
      valueLabels: 'show',
      preferredSeriesType: 'bar',
      layers: [
        {
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'area',
          splitAccessors: ['d'],
          xAccessor: 'a',
          accessors: ['b', 'c'],
        },
      ],
    };
    const supportedLayers = [
      {
        type: LayerTypes.DATA,
        label: 'Visualization',
      },
      {
        type: LayerTypes.REFERENCELINE,
        label: LayerTypes.REFERENCELINE,
      },
      {
        type: LayerTypes.ANNOTATIONS,
        label: 'Annotations',
        icon: IconChartBarAnnotations,
        disabled: true,
      },
    ];

    const rtlRender = render(
      <AddLayerButton
        state={state}
        supportedLayers={supportedLayers}
        addLayer={addLayer}
        eventAnnotationService={eventAnnotationServiceMock}
      />
    );
    return {
      ...rtlRender,
      clickAddLayer: () => {
        fireEvent.click(screen.getByLabelText('Add layer'));
      },
      clickVisualizationButton: () => {
        fireEvent.click(screen.getByRole('menuitem', { name: 'Visualization' }));
        // EuiContextMenu defers switching to a sub-panel by one animation frame
        act(() => {
          jest.advanceTimersByTime(ONE_FRAME_MS);
        });
      },
      clickSeriesOptionsButton: (seriesType = 'line') => {
        const lineOption = screen.getByTestId(`lnsXY_seriesType-${seriesType}`);
        fireEvent.click(lineOption);
      },
      getSeriesTypeOptions: () => {
        return screen.getAllByTestId('lnsChartSwitch-option-label').map((el) => el.textContent);
      },
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders all compatible series types', () => {
    const { clickAddLayer, clickVisualizationButton, getSeriesTypeOptions } =
      renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    expect(getSeriesTypeOptions()).toEqual(['Bar', 'Area', 'Line']);
  });
  it('calls addLayer with a proper series type when button is clicked', () => {
    const { clickAddLayer, clickVisualizationButton, clickSeriesOptionsButton } =
      renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    clickSeriesOptionsButton('line');
    expect(addLayer).toHaveBeenCalledWith(LayerTypes.DATA, { seriesType: 'line' });
  });
});

describe('Reference layer source selection', () => {
  const renderReferenceMenu = (isEsqlChart: boolean) => {
    const addLayer = jest.fn();
    render(
      <AddLayerButton
        state={{
          legend: { position: Position.Bottom, isVisible: true },
          valueLabels: 'show',
          preferredSeriesType: 'bar',
          layers: [],
        }}
        supportedLayers={[{ type: LayerTypes.REFERENCELINE, label: 'Reference lines' }]}
        addLayer={addLayer}
        eventAnnotationService={eventAnnotationServiceMock}
        isEsqlChart={isEsqlChart}
      />,
      { wrapper: I18nProvider }
    );
    fireEvent.click(screen.getByLabelText('Add layer'));
    fireEvent.click(screen.getByTestId('lnsLayerAddButton-referenceLine'));
    return addLayer;
  };

  it.each([
    ['static', LENS_DATASOURCE_ID.FORM_BASED, false],
    ['esql', LENS_DATASOURCE_ID.TEXT_BASED, true],
  ] as const)(
    'creates a %s reference layer on ES|QL charts',
    async (source, datasourceId, ignoreInitialValues) => {
      const addLayer = renderReferenceMenu(true);
      expect(addLayer).not.toHaveBeenCalled();
      const menuItem = await screen.findByTestId(`lnsReferenceLineLayer_${source}`);
      expect(menuItem).toHaveTextContent(
        source === 'static' ? 'Static reference lines' : 'ES|QL reference lines'
      );
      expect(menuItem).toHaveTextContent(
        source === 'static'
          ? 'Set fixed values for budgets, targets, or thresholds.'
          : 'Calculate thresholds using a separate ES|QL query.'
      );
      fireEvent.click(menuItem);
      expect(addLayer).toHaveBeenCalledWith(LayerTypes.REFERENCELINE, {
        ignoreInitialValues,
        datasourceId,
      });
    }
  );

  it('keeps direct reference-layer creation on form-based charts', () => {
    const addLayer = renderReferenceMenu(false);
    expect(addLayer).toHaveBeenCalledWith(LayerTypes.REFERENCELINE);
    expect(screen.queryByTestId('lnsReferenceLineLayer_static')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lnsReferenceLineLayer_esql')).not.toBeInTheDocument();
  });
});
