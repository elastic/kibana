/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LayerSettings } from './layer_settings';
import type {
  FramePublicAPI,
  VisualizationLayerSettingsProps,
  LensPartitionLayerState,
  LensPartitionVisualizationState,
} from '@kbn/lens-common';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('layer settings', () => {
  describe('multiple metrics switch', () => {
    const getState = (allowMultipleMetrics: boolean): LensPartitionVisualizationState => ({
      shape: 'pie',
      layers: [
        {
          layerId,
          allowMultipleMetrics,
        } as LensPartitionLayerState,
      ],
    });

    const layerId = 'layer-id';
    const props: VisualizationLayerSettingsProps<LensPartitionVisualizationState> & {
      section: 'data' | 'appearance';
    } = {
      setState: jest.fn(),
      layerId,
      state: getState(false),
      frame: {} as FramePublicAPI,
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      section: 'data',
    };

    const renderLayerSettings = (
      propsOverrides?: Partial<
        VisualizationLayerSettingsProps<LensPartitionVisualizationState> & {
          section: 'data' | 'appearance';
        }
      >
    ) => render(<LayerSettings {...props} {...propsOverrides} />);

    it('toggles multiple metrics', async () => {
      renderLayerSettings();
      expect(props.setState).not.toHaveBeenCalled();
      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);
      expect(props.setState).toHaveBeenLastCalledWith({
        ...props.state,
        layers: [
          {
            ...props.state.layers[0],
            allowMultipleMetrics: true,
          },
        ],
      });
      cleanup();

      renderLayerSettings({ state: getState(true) });
      await userEvent.click(screen.getByRole('switch'));
      expect(props.setState).toHaveBeenLastCalledWith({
        ...props.state,
        layers: [
          {
            ...props.state.layers[0],
            allowMultipleMetrics: false,
          },
        ],
      });
    });

    test('switch reflects state', () => {
      renderLayerSettings({ state: getState(false) });
      expect(screen.getByRole('switch')).not.toBeChecked();
      cleanup();
      renderLayerSettings({ state: getState(true) });
      expect(screen.getByRole('switch')).toBeChecked();
    });

    test('should not render anything for mosaic', () => {
      const { container } = renderLayerSettings({ state: { ...getState(false), shape: 'mosaic' } });
      expect(container).toBeEmptyDOMElement();
    });

    test('should not render anything for the appearance section', () => {
      const { container } = renderLayerSettings({ section: 'appearance' });
      expect(container).toBeEmptyDOMElement();
    });
  });
});
