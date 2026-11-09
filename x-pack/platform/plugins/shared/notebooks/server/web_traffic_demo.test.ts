/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_TRAFFIC_DEMO } from '../public/demo/web_traffic_demo';
import { notebookAttributesSchema } from './schema';

describe('WEB_TRAFFIC_DEMO', () => {
  it('is a notebook the create route accepts', () => {
    expect(() => notebookAttributesSchema.validate(WEB_TRAFFIC_DEMO)).not.toThrow();
  });

  it('lays out only cells it defines', () => {
    const { cells, cellOrder, panels = [] } = WEB_TRAFFIC_DEMO;
    expect(cellOrder.every((id) => id in cells)).toBe(true);
    const panelCellIds = panels.flatMap((app) => app.panels.map(({ cellId }) => cellId));
    expect(panelCellIds.every((id) => id in cells)).toBe(true);
  });
});
