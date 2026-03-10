/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformPanelReferencesOut } from './transform_references_out';

describe('transformPanelReferencesOut', () => {
  it('does not transform panel references out for non-embeddable functions', () => {
    const panelReferences = [
      { id: 'test-id', name: 'valid-reference-name', type: 'valid-reference-type' },
    ];
    const transformedPanelReferences = transformPanelReferencesOut(panelReferences);
    expect(transformedPanelReferences).toEqual(panelReferences);
  });

  describe('embeddable functions', () => {
    it('transforms panel references out for legacy lens embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'l0_embeddable.id', type: 'lens' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'lens' },
      ]);
    });

    it('transforms panel references out for legacy visualization embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'l1_embeddable.id', type: 'visualization' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'visualization' },
      ]);
    });

    it('transforms panel references out for legacy map embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'l2_embeddable.id', type: 'map' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'map' },
      ]);
    });

    it('transforms panel references out for legacy search embeddable', () => {
      const panelReferences = [{ id: 'test-id', name: 'l1000_embeddable.id', type: 'search' }];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences,
        'embeddable.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'search' },
      ]);
    });
  });
  describe('savedLens function', () => {
    it('transforms panel references out for savedLens', () => {
      const panelReferences0 = [
        { id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d"', name: 'l0_savedLens.id', type: 'lens' },
      ];
      const transformedPanelReferences = transformPanelReferencesOut(
        panelReferences0,
        'savedLens.id'
      );
      expect(transformedPanelReferences).toEqual([
        { id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d"', name: 'savedObjectRef', type: 'lens' },
      ]);

      const panelReferences1 = [{ id: 'test-id', name: 'l1_savedLens.id', type: 'lens' }];
      const transformedPanelReferences1 = transformPanelReferencesOut(
        panelReferences1,
        'savedLens.id'
      );
      expect(transformedPanelReferences1).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'lens' },
      ]);

      const panelReferences2 = [{ id: 'test-id', name: 'l100_savedLens.id', type: 'lens' }];
      const transformedPanelReferences2 = transformPanelReferencesOut(
        panelReferences2,
        'savedLens.id'
      );
      expect(transformedPanelReferences2).toEqual([
        { id: 'test-id', name: 'savedObjectRef', type: 'lens' },
      ]);
    });
  });

  it('transforms panel references out for savedVisualization', () => {
    const panelReferences0 = [
      { id: 'test-id', name: 'l1_savedVisualization.id', type: 'visualization' },
    ];
    const transformedPanelReferences0 = transformPanelReferencesOut(
      panelReferences0,
      'savedVisualization.id'
    );
    expect(transformedPanelReferences0).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'visualization' },
    ]);

    const panelReferences1 = [
      { id: 'test-id', name: 'l1_savedVisualization.id', type: 'visualization' },
    ];
    const transformedPanelReferences1 = transformPanelReferencesOut(
      panelReferences1,
      'savedVisualization.id'
    );
    expect(transformedPanelReferences1).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'visualization' },
    ]);

    const panelReferences2 = [
      { id: 'test-id', name: 'l100_savedVisualization.id', type: 'visualization' },
    ];
    const transformedPanelReferences2 = transformPanelReferencesOut(
      panelReferences2,
      'savedVisualization.id'
    );
    expect(transformedPanelReferences2).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'visualization' },
    ]);
  });
});

describe('savedMap function', () => {
  it('transforms panel references out for savedMap', () => {
    const panelReferences0 = [{ id: 'test-id', name: 'l1_savedMap.id', type: 'map' }];
    const transformedPanelReferences0 = transformPanelReferencesOut(
      panelReferences0,
      'savedMap.id'
    );
    expect(transformedPanelReferences0).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'map' },
    ]);

    const panelReferences1 = [{ id: 'test-id', name: 'l1_savedMap.id', type: 'map' }];
    const transformedPanelReferences1 = transformPanelReferencesOut(
      panelReferences1,
      'savedMap.id'
    );
    expect(transformedPanelReferences1).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'map' },
    ]);

    const panelReferences2 = [{ id: 'test-id', name: 'l100_savedMap.id', type: 'map' }];
    const transformedPanelReferences2 = transformPanelReferencesOut(
      panelReferences2,
      'savedMap.id'
    );
    expect(transformedPanelReferences2).toEqual([
      { id: 'test-id', name: 'savedObjectRef', type: 'map' },
    ]);
  });
});
