/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  allToolsSelectionWildcard,
  platformCoreTools,
  type ToolSelection,
} from '@kbn/agent-builder-common';
import {
  appendProductDocumentationTool,
  isProductDocumentationToolSelected,
} from './append_product_documentation_tool';

describe('appendProductDocumentationTool', () => {
  const productDocToolId = platformCoreTools.productDocumentation;

  it('returns the same selections when product documentation is already selected', () => {
    const selections: ToolSelection[] = [
      { tool_ids: [platformCoreTools.search, productDocToolId] },
    ];
    expect(isProductDocumentationToolSelected(selections)).toBe(true);
    expect(appendProductDocumentationTool(selections)).toBe(selections);
  });

  it('considers the tool selected when a wildcard selection is present', () => {
    const selections: ToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];
    expect(isProductDocumentationToolSelected(selections)).toBe(true);
    expect(appendProductDocumentationTool(selections)).toBe(selections);
  });

  it('appends product documentation to an existing tool group', () => {
    const selections: ToolSelection[] = [{ tool_ids: [platformCoreTools.search] }];
    expect(appendProductDocumentationTool(selections)).toEqual([
      { tool_ids: [platformCoreTools.search, productDocToolId] },
    ]);
  });

  it('creates a new tool group when none exists', () => {
    expect(appendProductDocumentationTool([])).toEqual([{ tool_ids: [productDocToolId] }]);
  });
});
