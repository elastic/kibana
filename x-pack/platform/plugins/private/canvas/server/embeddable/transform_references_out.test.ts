/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformPanelReferencesOut } from './transform_references_out';

describe('transformPanelReferencesOut', () => {
  it('does not transform panel reference if the panelRefName does not match', () => {
    const panelReferences = [
      { id: 'test-id', name: 'valid-reference-name', type: 'valid-reference-type' },
    ];
    const transformedPanelReferences = transformPanelReferencesOut(
      panelReferences,
      'non-matching-reference-name'
    );
    expect(transformedPanelReferences).toEqual(panelReferences);
  });

  describe('embeddable functions', () => {
    it('transforms panel references out for legacy lens embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'embeddable.id', type: 'lens' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'lens' },
      ]);
    });

    it('transforms panel references out for legacy visualization embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'embeddable.id', type: 'visualization' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'visualization' },
      ]);
    });

    it('transforms panel references out for legacy map embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'embeddable.id', type: 'map' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'map' },
      ]);
    });

    it('transforms panel references out for legacy search embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'embeddable.id', type: 'search' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'search' },
      ]);
    });
  });
});
