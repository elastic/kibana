/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InnerJoin } from './inner_join';

jest.mock('ui/vis/editors/default/schemas', () => {
  class MockSchemas {}
  return {
    Schemas: MockSchemas,
  };
});
jest.mock('../../kibana_services', () => {});
jest.mock('ui/agg_types', () => {});
jest.mock('ui/timefilter', () => {});
jest.mock('../vector_layer', () => {});

const rightSource = {
  id: 'd3625663-5b34-4d50-a784-0d743f676a0c',
  indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
  indexPatternTitle: 'kibana_sample_data_logs',
  term: 'geo.dest',
  metrics: [{ type: 'count' }],
};

const mockSource = {
  getInspectorAdapters() {},
  createField({ fieldName: name }) {
    return {
      getName() {
        return name;
      },
    };
  },
};

const leftJoin = new InnerJoin(
  {
    leftField: 'iso2',
    right: rightSource,
  },
  mockSource
);
const COUNT_PROPERTY_NAME = '__kbnjoin__count_groupby_kibana_sample_data_logs.geo.dest';

describe('joinPropertiesToFeature', () => {
  it('Should add join property to features in feature collection', () => {
    const feature = {
      properties: {
        iso2: 'CN',
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('CN', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      iso2: 'CN',
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  it('Should delete previous join property values from feature', () => {
    const feature = {
      properties: {
        iso2: 'CN',
        [COUNT_PROPERTY_NAME]: 61,
        [`__kbn__dynamic__${COUNT_PROPERTY_NAME}__fillColor`]: 1,
      },
    };
    const propertiesMap = new Map();

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      iso2: 'CN',
    });
  });

  it('Should coerce to string before joining', () => {
    const leftJoin = new InnerJoin(
      {
        leftField: 'zipcode',
        right: rightSource,
      },
      mockSource
    );

    const feature = {
      properties: {
        zipcode: 40204,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      zipcode: 40204,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  it('Should handle undefined values', () => {
    const feature = {
      //this feature does not have the iso2 field
      properties: {
        zipcode: 40204,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      zipcode: 40204,
    });
  });

  it('Should handle falsy values', () => {
    const leftJoin = new InnerJoin(
      {
        leftField: 'code',
        right: rightSource,
      },
      mockSource
    );

    const feature = {
      properties: {
        code: 0,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('0', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      code: 0,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });
});
