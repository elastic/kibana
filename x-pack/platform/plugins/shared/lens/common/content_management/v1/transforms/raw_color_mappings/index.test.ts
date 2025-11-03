/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToRawColorMappingsFn } from '.';
import type { LensAttributes } from '../../../../../server/content_management/v1/types';
import { convertXYToRawColorMappings } from './xy';
import { convertPieToRawColorMappings } from './partition';
import { convertDatatableToRawColorMappings } from './datatable';
import { convertTagcloudToRawColorMappings } from './tagcloud';

jest.mock('./xy', () => ({
  convertXYToRawColorMappings: jest.fn().mockReturnValue('new xyVisState'),
}));
jest.mock('./partition', () => ({
  convertPieToRawColorMappings: jest.fn().mockReturnValue('new partitionVisState'),
}));
jest.mock('./datatable', () => ({
  convertDatatableToRawColorMappings: jest.fn().mockReturnValue('new datatableVisState'),
}));
jest.mock('./tagcloud', () => ({
  convertTagcloudToRawColorMappings: jest.fn().mockReturnValue('new tagcloudVisState'),
}));

describe('Legend stat transforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return original attributes if no state', () => {
    const attributes = {
      state: undefined,
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(result).toBe(attributes);
  });

  it('should return original attributes for noop visualizationTypes', () => {
    const attributes = {
      state: {},
      visualizationType: 'noop',
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(result).toBe(attributes);
  });

  it('should convert lnsXY attributes', () => {
    const attributes = {
      state: {
        visualization: 'xyVisState',
        datasourceStates: 'datasourceStates',
      },
      visualizationType: 'lnsXY',
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(convertXYToRawColorMappings).toBeCalledWith('xyVisState', 'datasourceStates');
    expect(result.state).toMatchObject({
      visualization: 'new xyVisState',
    });
  });

  it('should convert lnsPie attributes', () => {
    const attributes = {
      state: {
        visualization: 'partitionVisState',
        datasourceStates: 'datasourceStates',
      },
      visualizationType: 'lnsPie',
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(convertPieToRawColorMappings).toBeCalledWith('partitionVisState', 'datasourceStates');
    expect(result.state).toMatchObject({
      visualization: 'new partitionVisState',
    });
  });

  it('should convert lnsDatatable attributes', () => {
    const attributes = {
      state: {
        visualization: 'datatableVisState',
        datasourceStates: 'datasourceStates',
      },
      visualizationType: 'lnsDatatable',
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(convertDatatableToRawColorMappings).toBeCalledWith(
      'datatableVisState',
      'datasourceStates'
    );
    expect(result.state).toMatchObject({
      visualization: 'new datatableVisState',
    });
  });

  it('should convert lnsTagcloud attributes', () => {
    const attributes = {
      state: {
        visualization: 'tagcloudVisState',
        datasourceStates: 'datasourceStates',
      },
      visualizationType: 'lnsTagcloud',
    } as LensAttributes;
    const result = convertToRawColorMappingsFn(attributes);

    expect(convertTagcloudToRawColorMappings).toBeCalledWith(
      'tagcloudVisState',
      'datasourceStates'
    );
    expect(result.state).toMatchObject({
      visualization: 'new tagcloudVisState',
    });
  });
});
