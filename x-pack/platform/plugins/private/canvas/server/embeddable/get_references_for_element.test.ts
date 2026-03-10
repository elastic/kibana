/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getReferencesForElement } from './get_references_for_element';

describe('getReferencesForElement', () => {
  it('should return the references for the element and remove the element ID prefix from the reference names', () => {
    const references = [
      { name: 'element-id:reference-1', id: 'reference-1-id', type: 'reference-1-type' },
      { name: 'element-id:reference-2', id: 'reference-2-id', type: 'reference-2-type' },
      { name: 'other-element-id:reference-3', id: 'reference-3-id', type: 'reference-3-type' },
      { name: 'other-element-id:reference-4', id: 'reference-4-id', type: 'reference-4-type' },
      { name: 'other-element-id:reference-5', id: 'reference-5-id', type: 'reference-5-type' },
    ];
    const elementId = 'element-id';
    const result = getReferencesForElement(references, elementId);
    expect(result).toEqual([
      { name: 'reference-1', id: 'reference-1-id', type: 'reference-1-type' },
      { name: 'reference-2', id: 'reference-2-id', type: 'reference-2-type' },
    ]);
  });

  it('should return an empty array if there are no references for the element', () => {
    const references = [
      { name: 'other-element-id:reference-1', id: 'reference-1-id', type: 'reference-1-type' },
      { name: 'other-element-id:reference-2', id: 'reference-2-id', type: 'reference-2-type' },
    ];
    const elementId = 'element-id';
    const result = getReferencesForElement(references, elementId);
    expect(result).toEqual([]);
  });
});
