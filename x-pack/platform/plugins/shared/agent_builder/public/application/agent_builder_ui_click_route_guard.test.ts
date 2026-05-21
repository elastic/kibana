/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgentBuilderUiClickRoutePathname } from './agent_builder_ui_click_route_guard';

describe('isAgentBuilderUiClickRoutePathname', () => {
  it('accepts root', () => {
    expect(isAgentBuilderUiClickRoutePathname('/')).toBe(true);
    expect(isAgentBuilderUiClickRoutePathname('')).toBe(true);
  });

  it('accepts agent and manage prefixes', () => {
    expect(isAgentBuilderUiClickRoutePathname('/agents/x')).toBe(true);
    expect(isAgentBuilderUiClickRoutePathname('/manage/tools')).toBe(true);
  });

  it('accepts legacy conversation paths', () => {
    expect(isAgentBuilderUiClickRoutePathname('/conversations/abc')).toBe(true);
  });

  it('strips query string before matching', () => {
    expect(isAgentBuilderUiClickRoutePathname('/manage/tools?x=1')).toBe(true);
  });

  it('rejects paths outside Agent Builder routes', () => {
    expect(isAgentBuilderUiClickRoutePathname('/discover')).toBe(false);
    expect(isAgentBuilderUiClickRoutePathname('/app/discover')).toBe(false);
    expect(isAgentBuilderUiClickRoutePathname('/connectors')).toBe(false);
  });
});
