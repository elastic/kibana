/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findPanelReference } from './panel_reference';

const references = [
  { name: 'panel_0', type: 'lens', id: 'bare' },
  { name: '1:panel_1', type: 'search', id: 'prefixed' },
  { name: 'abc:savedObjectRef', type: 'map', id: 'by-ref-94' },
  { name: 'abc:indexpattern-datasource-layer-x', type: 'index-pattern', id: 'layer-view' },
];

describe('findPanelReference', () => {
  it('finds a pre-9.4 reference by its bare or panel-prefixed name', () => {
    expect(findPanelReference({ panelIndex: '0', panelRefName: 'panel_0' }, references)?.id).toBe(
      'bare'
    );
    expect(findPanelReference({ panelIndex: '1', panelRefName: 'panel_1' }, references)?.id).toBe(
      'prefixed'
    );
  });

  it('finds a 9.4 reference as <panel id>:savedObjectRef, from panelIndex or gridData.i', () => {
    expect(findPanelReference({ panelIndex: 'abc' }, references)?.id).toBe('by-ref-94');
    expect(findPanelReference({ gridData: { i: 'abc' } }, references)?.id).toBe('by-ref-94');
  });

  it('leaves a by-value panel without a reference, even when its layers reference data views', () => {
    expect(
      findPanelReference({ panelIndex: 'abc', panelRefName: undefined }, [references[3]])
    ).toBe(undefined);
    expect(findPanelReference({}, references)).toBe(undefined);
  });
});
