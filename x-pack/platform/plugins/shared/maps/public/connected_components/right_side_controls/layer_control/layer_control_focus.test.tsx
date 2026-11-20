/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./layer_toc', () => ({
  LayerTOC: () => <div>mockLayerTOC</div>,
}));

jest.mock('../../../kibana_services', () => ({
  isScreenshotMode: () => false,
}));

import React, { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { LayerControl } from './layer_control';

const Harness = ({ initialOpen }: { initialOpen: boolean }) => {
  const [isLayerTOCOpen, setIsLayerTOCOpen] = useState(initialOpen);
  return (
    <LayerControl
      isReadOnly={false}
      showAddLayerWizard={async () => {}}
      closeLayerTOC={() => setIsLayerTOCOpen(false)}
      openLayerTOC={() => setIsLayerTOCOpen(true)}
      hideAllLayers={() => {}}
      showAllLayers={() => {}}
      isLayerTOCOpen={isLayerTOCOpen}
      layerList={[]}
      isFlyoutOpen={false}
      isLoading={false}
    />
  );
};

describe('LayerControl focus management', () => {
  test('moves focus to the expand button after collapsing the panel', async () => {
    renderWithI18n(<Harness initialOpen={true} />);

    await userEvent.click(screen.getByRole('button', { name: 'Collapse layers panel' }));

    expect(screen.getByRole('button', { name: 'Expand layers panel' })).toHaveFocus();
  });

  test('moves focus to the collapse button after expanding the panel', async () => {
    renderWithI18n(<Harness initialOpen={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Expand layers panel' }));

    expect(screen.getByRole('button', { name: 'Collapse layers panel' })).toHaveFocus();
  });

  test('does not steal focus on initial render', () => {
    renderWithI18n(<Harness initialOpen={true} />);

    expect(screen.getByRole('button', { name: 'Collapse layers panel' })).not.toHaveFocus();
  });
});
