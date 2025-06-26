/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({
  isScreenshotMode: () => {
    return false;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';
import { ILayer } from '../../../classes/layers/layer';

import { AttributionControl } from './attribution_control';

describe('AttributionControl', () => {
  test('is rendered', async () => {
    const mockLayer1 = {
      getAttributions: async () => {
        return [{ url: '', label: 'attribution with no link' }];
      },
    } as unknown as ILayer;
    const mockLayer2 = {
      getAttributions: async () => {
        return [{ url: 'https://coolmaps.com', label: 'attribution with link' }];
      },
    } as unknown as ILayer;
    const component = shallow(
      <AttributionControl layerList={[mockLayer1, mockLayer2]} isFullScreen={true} />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
