/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToolFile } from './tool';

describe('renderToolFile', () => {
  it('generates a valid tool definition file', () => {
    const result = renderToolFile({
      name: 'alert-search',
      domain: 'security',
      toolId: 'security.alert_search',
      description: 'Search security alerts',
    });

    expect(result).toContain("import { z } from '@kbn/zod'");
    expect(result).toContain("import { ToolType } from '@kbn/agent-builder-common'");
    expect(result).toContain('alertSearchSchema');
    expect(result).toContain('getAlertSearchTool');
    expect(result).toContain("id: 'security.alert_search'");
    expect(result).toContain('Copyright Elasticsearch B.V.');
  });
});
