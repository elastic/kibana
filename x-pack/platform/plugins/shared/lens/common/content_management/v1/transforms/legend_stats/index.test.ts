/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToLegendStats } from '.';
import type { LensAttributes } from '../../../../../server/content_management/v1/types';
import { convertPartitionToLegendStats } from './partition';
import { convertXYToLegendStats } from './xy';

jest.mock('./xy', () => ({
  convertXYToLegendStats: jest.fn().mockReturnValue('new xyVisState'),
}));
jest.mock('./partition', () => ({
  convertPartitionToLegendStats: jest.fn().mockReturnValue('new partitionVisState'),
}));

describe('Legend stat transforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return original attributes if no state', () => {
    const attributes = {
      state: undefined,
    } as LensAttributes;
    const result = convertToLegendStats(attributes);

    expect(result).toBe(attributes);
  });

  it('should return original attributes for noop visualizationTypes', () => {
    const attributes = {
      state: {},
      visualizationType: 'noop',
    } as LensAttributes;
    const result = convertToLegendStats(attributes);

    expect(result).toBe(attributes);
  });

  it('should convert lnsXY attributes', () => {
    const attributes = {
      state: {
        visualization: 'xyVisState',
      },
      visualizationType: 'lnsXY',
    } as LensAttributes;
    const result = convertToLegendStats(attributes);

    expect(convertXYToLegendStats).toBeCalledWith('xyVisState');
    expect(result.state).toMatchObject({
      visualization: 'new xyVisState',
    });
  });

  it('should convert lnsPie attributes', () => {
    const attributes = {
      state: {
        visualization: 'partitionVisState',
      },
      visualizationType: 'lnsPie',
    } as LensAttributes;
    const result = convertToLegendStats(attributes);

    expect(convertPartitionToLegendStats).toBeCalledWith('partitionVisState');
    expect(result.state).toMatchObject({
      visualization: 'new partitionVisState',
    });
  });
});
