/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySmvTableFilter, buildCriteriaFields } from './entity_partition_helpers';

describe('buildCriteriaFields', () => {
  it('includes detector_index and non-blank entity fields', () => {
    const fields = buildCriteriaFields(2, [
      { fieldName: 'airline', fieldValue: 'AAL' },
      { fieldName: 'host', fieldValue: null },
    ]);
    expect(fields).toEqual([
      { fieldName: 'detector_index', fieldValue: 2 },
      { fieldName: 'airline', fieldValue: 'AAL' },
    ]);
  });

  it('returns only detector_index when all entity values are null', () => {
    expect(buildCriteriaFields(0, [{ fieldName: 'x', fieldValue: null }])).toEqual([
      { fieldName: 'detector_index', fieldValue: 0 },
    ]);
  });
});

describe('applySmvTableFilter', () => {
  const controls = [
    { fieldName: 'airline', fieldValue: 'AAL' },
    { fieldName: 'region', fieldValue: null },
  ];

  it('sets entity value on include (+) when current value differs', () => {
    const setEntities = jest.fn();
    applySmvTableFilter('airline', 'BAW', '+', controls, setEntities);
    expect(setEntities).toHaveBeenCalledWith({ airline: 'BAW', region: null });
  });

  it('clears entity value on exclude (-) when current value matches', () => {
    const setEntities = jest.fn();
    applySmvTableFilter('airline', 'AAL', '-', controls, setEntities);
    expect(setEntities).toHaveBeenCalledWith({ airline: null, region: null });
  });

  it('no-ops on include (+) when value is already selected', () => {
    const setEntities = jest.fn();
    applySmvTableFilter('airline', 'AAL', '+', controls, setEntities);
    expect(setEntities).not.toHaveBeenCalled();
  });

  it('no-ops on exclude (-) when value is not currently selected', () => {
    const setEntities = jest.fn();
    applySmvTableFilter('airline', 'BAW', '-', controls, setEntities);
    expect(setEntities).not.toHaveBeenCalled();
  });

  it('no-ops when the field is not in the entity controls', () => {
    const setEntities = jest.fn();
    applySmvTableFilter('unknown_field', 'val', '+', controls, setEntities);
    expect(setEntities).not.toHaveBeenCalled();
  });
});
