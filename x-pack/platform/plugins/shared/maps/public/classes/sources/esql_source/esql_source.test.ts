/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { ESQLSource } from './esql_source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';

vi.mock('../../../kibana_services', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { dataPluginMock } = await import('@kbn/data-plugin/public/mocks');
  return {
    getData: () => dataPluginMock.createStartContract(),
  };
});

vi.mock('@kbn/esql-utils', () => {
  const mocked = {
    getESQLQueryColumnsRaw: () => mockGetESQLQueryColumnsRaw(),
  };
  return { ...mocked, default: mocked };
});

const mockGetESQLQueryColumnsRaw = vi.fn();

describe('getSupportedShapeTypes', () => {
  beforeEach(() => {
    mockGetESQLQueryColumnsRaw.mockReset();
  });

  test('should return point for geo_point column', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => [
      {
        name: 'geo.coordinates',
        type: 'geo_point',
      },
    ]);
    const esqlSource = new ESQLSource({
      esql: 'from kibana_sample_data_logs | keep geo.coordinates | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });

  test('should return all geometry types for geo_shape column', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => [
      {
        name: 'geometry',
        type: 'geo_shape',
      },
    ]);
    const esqlSource = new ESQLSource({
      esql: 'from world_countries | keep geometry | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([
      VECTOR_SHAPE_TYPE.POINT,
      VECTOR_SHAPE_TYPE.LINE,
      VECTOR_SHAPE_TYPE.POLYGON,
    ]);
  });

  test('should fallback to point when geometry column can not be found', async () => {
    mockGetESQLQueryColumnsRaw.mockImplementation(() => []);
    const esqlSource = new ESQLSource({
      esql: 'from world_countries | keep geometry | limit 10000',
    });
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });
});
