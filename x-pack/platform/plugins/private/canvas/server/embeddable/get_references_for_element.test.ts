/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getReferencesForElement } from './get_references_for_element';

describe('getReferencesForElement', () => {
  const references = [
    { name: 'element-id:l0_reference-1', id: 'reference-1-id', type: 'reference-1-type' },
    { name: 'element-id:l1000_reference-2', id: 'reference-2-id', type: 'reference-2-type' },
    {
      id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d',
      name: 'element-1e179b97-d902-4104-84ea-bda6203c8b7b:l1_savedLens.id',
      type: 'lens',
    },
    {
      id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
      name: 'element-542c41d5-82d7-4382-a3a5-d3b48d82ff05:l1_savedMap.id',
      type: 'map',
    },
  ];
  it('should return the references for the element and remove the element ID prefix from the reference names', () => {
    const result1 = getReferencesForElement(references, 'element-id');
    expect(result1).toEqual([
      { name: 'reference-1', id: 'reference-1-id', type: 'reference-1-type' },
      { name: 'reference-2', id: 'reference-2-id', type: 'reference-2-type' },
    ]);

    const result2 = getReferencesForElement(
      references,
      'element-1e179b97-d902-4104-84ea-bda6203c8b7b'
    );
    expect(result2).toEqual([
      {
        id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d',
        name: 'savedLens.id',
        type: 'lens',
      },
    ]);

    const result3 = getReferencesForElement(
      references,
      'element-542c41d5-82d7-4382-a3a5-d3b48d82ff05'
    );
    expect(result3).toEqual([
      {
        id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
        name: 'savedMap.id',
        type: 'map',
      },
    ]);
  });

  it('should return an empty array if there are no references for the element', () => {
    const result = getReferencesForElement(references, 'other-element-id');
    expect(result).toEqual([]);
  });
});
