/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { convertToRawColorMappingsFn } from '.';
import type { LensAttributes } from '../../../../../server/content_management/v1/types';
import { convertXYToRawColorMappings } from './xy';
import { convertPieToRawColorMappings } from './partition';
import { convertDatatableToRawColorMappings } from './datatable';
import { convertTagcloudToRawColorMappings } from './tagcloud';

vi.mock('./xy', () => {
  const mocked = {
    convertXYToRawColorMappings: vi.fn().mockReturnValue('new xyVisState'),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./partition', () => {
  const mocked = {
    convertPieToRawColorMappings: vi.fn().mockReturnValue('new partitionVisState'),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./datatable', () => {
  const mocked = {
    convertDatatableToRawColorMappings: vi.fn().mockReturnValue('new datatableVisState'),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./tagcloud', () => {
  const mocked = {
    convertTagcloudToRawColorMappings: vi.fn().mockReturnValue('new tagcloudVisState'),
  };
  return { ...mocked, default: mocked };
});

describe('Legend stat transforms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(convertXYToRawColorMappings).toHaveBeenCalledWith('xyVisState', 'datasourceStates');
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

    expect(convertPieToRawColorMappings).toHaveBeenCalledWith(
      'partitionVisState',
      'datasourceStates'
    );
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

    expect(convertDatatableToRawColorMappings).toHaveBeenCalledWith(
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

    expect(convertTagcloudToRawColorMappings).toHaveBeenCalledWith(
      'tagcloudVisState',
      'datasourceStates'
    );
    expect(result.state).toMatchObject({
      visualization: 'new tagcloudVisState',
    });
  });
});
