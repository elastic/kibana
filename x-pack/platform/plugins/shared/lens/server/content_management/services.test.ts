/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContentManagementServicesTransforms } from '@kbn/object-versioning';
import type { XYVisualizationState } from '@kbn/lens-common';
import {
  LENS_ITEM_VERSION_V2,
  LENS_ITEM_VERSION_V3,
} from '@kbn/lens-common/content_management/constants';

import { servicesDefinitions } from './services';
import type { LensGetOut, LensSavedObject } from './latest';
import type { LensGetOut as LensGetOutV3, LensSavedObject as LensSavedObjectV3 } from './v3';

const getAttributes = <Version extends typeof LENS_ITEM_VERSION_V2 | typeof LENS_ITEM_VERSION_V3>({
  version,
  areaFill,
}: {
  version: Version;
  areaFill?: XYVisualizationState['areaFill'];
}) => ({
  title: 'Area chart',
  visualizationType: 'lnsXY',
  version,
  state: {
    datasourceStates: {},
    filters: [],
    query: { language: 'kuery', query: '' },
    visualization: {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'area',
      layers: [
        {
          layerId: 'layer-0',
          layerType: 'data',
          seriesType: 'area',
          accessors: ['y'],
          xAccessor: 'x',
        },
      ],
      ...(areaFill ? { areaFill } : {}),
    },
  },
});

const getSavedObject = <Attributes>(attributes: Attributes) => ({
  id: 'lens-id',
  type: 'lens',
  references: [],
  attributes,
});

const withAreaFill = (areaFill: XYVisualizationState['areaFill']) => ({
  state: { visualization: { areaFill } },
});

describe('Lens content management services', () => {
  const transforms = getContentManagementServicesTransforms(
    servicesDefinitions,
    LENS_ITEM_VERSION_V2
  );

  describe('when reading v3 items on v2', () => {
    it('get returns a valid v2 item with the v3 default fill pinned', () => {
      const { value, error } = transforms.get.out.result.down<LensGetOutV3, LensGetOut>(
        {
          item: getSavedObject(getAttributes({ version: LENS_ITEM_VERSION_V3 })),
          meta: { outcome: 'exactMatch' },
        },
        LENS_ITEM_VERSION_V3,
        { validate: true }
      );

      expect(error).toBeNull();
      expect(value?.item.attributes.version).toBe(LENS_ITEM_VERSION_V2);
      expect(value?.item.attributes).toMatchObject(withAreaFill('gradient'));
      expect(transforms.get.out.result.validate(value)).toBeNull();
    });

    it('search returns a valid v2 item with the v3 default fill pinned', () => {
      const { value, error } = transforms.search.out.result.down<
        LensSavedObjectV3,
        LensSavedObject
      >(getSavedObject(getAttributes({ version: LENS_ITEM_VERSION_V3 })), LENS_ITEM_VERSION_V3, {
        validate: false,
      });

      expect(error).toBeNull();
      expect(value?.attributes.version).toBe(LENS_ITEM_VERSION_V2);
      expect(value?.attributes).toMatchObject(withAreaFill('gradient'));
      expect(
        transforms.search.out.result.validate({ hits: [value], pagination: { total: 1 } })
      ).toBeNull();
    });
  });
});
