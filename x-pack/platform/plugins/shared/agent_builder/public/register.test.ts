/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentBuilderAppUpdate, buildAgentBuilderDeepLinks } from './register';

describe('buildAgentBuilderDeepLinks', () => {
  it('omits plugins and connectors when experimental features are disabled', () => {
    const links = buildAgentBuilderDeepLinks(false);
    expect(links.map((l) => l.id)).toEqual(['agents', 'skills', 'tools']);
  });

  it('includes plugins and connectors when experimental features are enabled', () => {
    const links = buildAgentBuilderDeepLinks(true);
    expect(links.map((l) => l.id)).toEqual(['agents', 'skills', 'plugins', 'connectors', 'tools']);
  });

  it('hides the app from navigation surfaces when agent-first chrome is enabled', () => {
    const update = buildAgentBuilderAppUpdate({
      experimentalFeaturesEnabled: false,
      isAgentFirstChrome: true,
    });

    expect(update.visibleIn).toEqual([]);
    expect(update.deepLinks?.map((link) => link.id)).toEqual(['agents', 'skills', 'tools']);
  });

  it('keeps default navigation visibility when agent-first chrome is disabled', () => {
    const update = buildAgentBuilderAppUpdate({
      experimentalFeaturesEnabled: false,
      isAgentFirstChrome: false,
    });

    expect(update.visibleIn).toBeUndefined();
  });
});
