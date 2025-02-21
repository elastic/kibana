/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '@kbn/maps-ems-plugin/common';
import { setEmsTmsDefaultModes } from './set_ems_tms_default_modes';

describe('setEmsTmsDefaultModes', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(setEmsTmsDefaultModes({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should add lightModeDefault to existing EMS_TMS source descriptors', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'EMS_TMS',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(setEmsTmsDefaultModes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: `[{"sourceDescriptor":{"type":"EMS_TMS","lightModeDefault":"${DEFAULT_EMS_ROADMAP_ID}"}}]`,
    });
  });

  // test edge case where sample data maps set lightModeDefault but still run migration
  test('Should not change lightModeDefault if provided', () => {
    const layerListJSON = JSON.stringify([
      {
        sourceDescriptor: {
          type: 'EMS_TMS',
          lightModeDefault: DEFAULT_EMS_ROADMAP_DESATURATED_ID,
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(setEmsTmsDefaultModes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: `[{"sourceDescriptor":{"type":"EMS_TMS","lightModeDefault":"${DEFAULT_EMS_ROADMAP_DESATURATED_ID}"}}]`,
    });
  });
});
