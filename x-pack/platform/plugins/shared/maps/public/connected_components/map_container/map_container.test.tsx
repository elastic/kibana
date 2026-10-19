/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Subject } from 'rxjs';
import { MapContainer } from './map_container';
import { FLYOUT_STATE } from '../../reducers/ui';
import { getDefaultMapSettings } from '../../reducers/map/default_map_settings';

// Importing the real '../../reducers/ui' module transitively pulls in the actions/selectors
// chain (and, through it, the ES|QL language registry), so it is stubbed to just the enum values
// MapContainer and this test need.
jest.mock('../../reducers/ui', () => ({
  FLYOUT_STATE: {
    NONE: 'NONE',
    LAYER_PANEL: 'LAYER_PANEL',
    ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD',
    MAP_SETTINGS_PANEL: 'MAP_SETTINGS_PANEL',
  },
}));

jest.mock('../../kibana_services', () => ({
  getIsDarkMode: () => false,
  getTheme: () => ({ theme$: { subscribe: () => ({ unsubscribe: () => {} }) } }),
  isScreenshotMode: () => false,
}));

jest.mock('../mb_map', () => ({
  MBMap: () => <div>MockMBMap</div>,
}));

jest.mock('../toolbar_overlay', () => ({
  ToolbarOverlay: () => <div data-test-subj="mapToolbarOverlay">Toolbar</div>,
}));

const mockRightSideControls = jest.fn();
jest.mock('../right_side_controls', () => ({
  RightSideControls: (props: Record<string, unknown>) => {
    mockRightSideControls(props);
    return <div data-test-subj="mapRightSideControls">Controls</div>;
  },
}));

jest.mock('../timeslider', () => ({
  Timeslider: () => <div>MockTimeslider</div>,
}));

jest.mock('../edit_layer_panel', () => ({
  EditLayerPanel: () => <div>MockEditLayerPanel</div>,
}));

jest.mock('../add_layer_panel', () => ({
  AddLayerPanel: () => <div>MockAddLayerPanel</div>,
}));

jest.mock('../map_settings_panel', () => ({
  MapSettingsPanel: () => <div>MockMapSettingsPanel</div>,
}));

function renderMapContainer(isInteractive?: boolean) {
  return render(
    <MapContainer
      addFilters={null}
      cancelAllInFlightRequests={() => {}}
      reload={() => {}}
      exitFullScreen={() => {}}
      flyoutDisplay={FLYOUT_STATE.NONE}
      isFullScreen={false}
      isTimesliderOpen={false}
      indexPatternIds={[]}
      mapInitError={undefined}
      settings={getDefaultMapSettings()}
      layerList={[]}
      waitUntilTimeLayersLoad$={new Subject<void>()}
      isInteractive={isInteractive}
    />
  );
}

describe('MapContainer isInteractive', () => {
  beforeEach(() => {
    mockRightSideControls.mockClear();
  });

  test('renders ToolbarOverlay and forwards isInteractive=true to RightSideControls when interactive', () => {
    const { queryByTestId } = renderMapContainer(true);
    expect(queryByTestId('mapToolbarOverlay')).toBeInTheDocument();
    expect(mockRightSideControls).toHaveBeenCalledWith(
      expect.objectContaining({ isInteractive: true })
    );
  });

  test('omits ToolbarOverlay and forwards isInteractive=false to RightSideControls when not interactive', () => {
    const { queryByTestId } = renderMapContainer(false);
    expect(queryByTestId('mapToolbarOverlay')).not.toBeInTheDocument();
    expect(mockRightSideControls).toHaveBeenCalledWith(
      expect.objectContaining({ isInteractive: false })
    );
  });
});
