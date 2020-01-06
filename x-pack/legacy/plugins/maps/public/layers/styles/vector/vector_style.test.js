/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { DataRequest } from '../../util/data_request';
import { VECTOR_SHAPE_TYPES } from '../../sources/vector_feature_types';
import { FIELD_ORIGIN } from '../../../../common/constants';

class MockField {
  constructor({ fieldName }) {
    this._fieldName = fieldName;
  }

  getName() {
    return this._fieldName;
  }

  isValid() {
    return !!this._fieldName;
  }
}

class MockSource {
  constructor({ supportedShapeTypes } = {}) {
    this._supportedShapeTypes = supportedShapeTypes || Object.values(VECTOR_SHAPE_TYPES);
  }
  getSupportedShapeTypes() {
    return this._supportedShapeTypes;
  }
  createField({ fieldName }) {
    return new MockField({ fieldName });
  }
}

describe('getDescriptorWithMissingStylePropsRemoved', () => {
  const fieldName = 'doIStillExist';
  const properties = {
    fillColor: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {},
    },
    lineColor: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        field: {
          name: fieldName,
          origin: FIELD_ORIGIN.SOURCE,
        },
      },
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: 'a color',
        field: { name: fieldName, origin: FIELD_ORIGIN.SOURCE },
      },
    },
  };

  it('Should return no changes when next oridinal fields contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties }, new MockSource());

    const nextOridinalFields = [new MockField({ fieldName })];
    const { hasChanges } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(
      nextOridinalFields
    );
    expect(hasChanges).toBe(false);
  });

  it('Should clear missing fields when next oridinal fields do not contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties }, new MockSource());

    const nextOridinalFields = [];
    const {
      hasChanges,
      nextStyleDescriptor,
    } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextOridinalFields);
    expect(hasChanges).toBe(true);
    expect(nextStyleDescriptor.properties).toEqual({
      fillColor: {
        options: {},
        type: 'STATIC',
      },
      iconOrientation: {
        options: {
          orientation: 0,
        },
        type: 'STATIC',
      },
      iconSize: {
        options: {
          color: 'a color',
        },
        type: 'DYNAMIC',
      },
      labelText: {
        options: {
          value: '',
        },
        type: 'STATIC',
      },
      labelColor: {
        options: {
          color: '#000000',
        },
        type: 'STATIC',
      },
      labelSize: {
        options: {
          size: 14,
        },
        type: 'STATIC',
      },
      lineColor: {
        options: {},
        type: 'DYNAMIC',
      },
      lineWidth: {
        options: {
          size: 1,
        },
        type: 'STATIC',
      },
      symbol: {
        options: {
          symbolId: 'airfield',
          symbolizeAs: 'circle',
        },
      },
    });
  });
});

describe('pluckStyleMetaFromSourceDataRequest', () => {
  describe('has features', () => {
    it('Should identify when feature collection only contains points', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'Point',
              },
              properties: {},
            },
            {
              geometry: {
                type: 'MultiPoint',
              },
              properties: {},
            },
          ],
        },
      });
      const vectorStyle = new VectorStyle({}, new MockSource());

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.isPointsOnly).toBe(true);
      expect(featuresMeta.isLinesOnly).toBe(false);
      expect(featuresMeta.isPolygonsOnly).toBe(false);
    });

    it('Should identify when feature collection only contains lines', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'LineString',
              },
              properties: {},
            },
            {
              geometry: {
                type: 'MultiLineString',
              },
              properties: {},
            },
          ],
        },
      });
      const vectorStyle = new VectorStyle({}, new MockSource());

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.isPointsOnly).toBe(false);
      expect(featuresMeta.isLinesOnly).toBe(true);
      expect(featuresMeta.isPolygonsOnly).toBe(false);
    });
  });

  describe('scaled field range', () => {
    const sourceDataRequest = new DataRequest({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            geometry: {
              type: 'Point',
            },
            properties: {
              myDynamicField: 1,
            },
          },
          {
            geometry: {
              type: 'Point',
            },
            properties: {
              myDynamicField: 10,
            },
          },
        ],
      },
    });

    it('Should not extract scaled field range when scaled field has no values', async () => {
      const vectorStyle = new VectorStyle(
        {
          properties: {
            fillColor: {
              type: VectorStyle.STYLE_TYPE.DYNAMIC,
              options: {
                field: {
                  origin: FIELD_ORIGIN.SOURCE,
                  name: 'myDynamicFieldWithNoValues',
                },
              },
            },
          },
        },
        new MockSource()
      );

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.isPointsOnly).toBe(true);
      expect(featuresMeta.isLinesOnly).toBe(false);
      expect(featuresMeta.isPolygonsOnly).toBe(false);
    });

    it('Should extract scaled field range', async () => {
      const vectorStyle = new VectorStyle(
        {
          properties: {
            fillColor: {
              type: VectorStyle.STYLE_TYPE.DYNAMIC,
              options: {
                field: {
                  origin: FIELD_ORIGIN.SOURCE,
                  name: 'myDynamicField',
                },
              },
            },
          },
        },
        new MockSource()
      );

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.myDynamicField).toEqual({
        delta: 9,
        max: 10,
        min: 1,
      });
    });
  });
});
