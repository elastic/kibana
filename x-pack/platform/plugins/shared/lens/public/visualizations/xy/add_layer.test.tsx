/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddLayerButton } from './add_layer';
import type { XYVisualizationState } from './types';
import { Position } from '@elastic/charts';
import { LENS_DATASOURCE_ID, LENS_LAYER_TYPES as LayerTypes } from '@kbn/lens-common';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';
import { IconChartBarAnnotations } from '@kbn/chart-icons';

// Failing: See https://github.com/elastic/kibana/issues/255059
describe.skip('AddLayerButton', () => {
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
      },
      clickSeriesOptionsButton: (seriesType = 'line') => {
        const lineOption = screen.getByTestId(`lnsXY_seriesType-${seriesType}`);
        fireEvent.click(lineOption);
      },
      waitForSeriesOptions: async () => {
        await waitFor(() => {
          expect(screen.queryByTestId('lnsXY_seriesType-area')).toBeInTheDocument();
        });
      },
      getSeriesTypeOptions: () => {
        return screen.getAllByTestId('lnsChartSwitch-option-label').map((el) => el.textContent);
      },
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all compatible series types', async () => {
    const { clickAddLayer, clickVisualizationButton, waitForSeriesOptions, getSeriesTypeOptions } =
      renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    await waitForSeriesOptions();
    expect(getSeriesTypeOptions()).toEqual(['Bar', 'Area', 'Line']);
  });
  it('calls addLayer with a proper series type when button is clicked', async () => {
    const {
      clickAddLayer,
      clickVisualizationButton,
      waitForSeriesOptions,
      clickSeriesOptionsButton,
    } = renderAddLayerButton();
    clickAddLayer();
    clickVisualizationButton();
    await waitForSeriesOptions();
    clickSeriesOptionsButton('line');
    expect(addLayer).toHaveBeenCalledWith(LayerTypes.DATA, undefined, undefined, 'line');
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
      />
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
      fireEvent.click(await screen.findByTestId(`lnsReferenceLineLayer_${source}`));
      expect(addLayer).toHaveBeenCalledWith(
        LayerTypes.REFERENCELINE,
        undefined,
        ignoreInitialValues,
        undefined,
        datasourceId
      );
    }
  );

  it('keeps direct reference-layer creation on form-based charts', () => {
    const addLayer = renderReferenceMenu(false);
    expect(addLayer).toHaveBeenCalledWith(LayerTypes.REFERENCELINE);
    expect(screen.queryByTestId('lnsReferenceLineLayer_static')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lnsReferenceLineLayer_esql')).not.toBeInTheDocument();
  });
});
