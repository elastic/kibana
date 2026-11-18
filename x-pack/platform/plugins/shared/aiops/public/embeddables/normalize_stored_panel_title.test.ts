/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeStoredPanelTitle } from './normalize_stored_panel_title';

describe('normalizeStoredPanelTitle', () => {
  it('drops blank stored titles so the default title can show', () => {
    expect(normalizeStoredPanelTitle(undefined)).toBeUndefined();
    expect(normalizeStoredPanelTitle('')).toBeUndefined();
    expect(normalizeStoredPanelTitle('   ')).toBeUndefined();
    expect(normalizeStoredPanelTitle('Custom title')).toBe('Custom title');
  });
});
