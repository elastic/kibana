/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  allToolsSelectionWildcard,
  platformCoreTools,
  toolMatchSelection,
  type ToolSelection,
} from '@kbn/agent-builder-common';

const productDocumentationTool = { id: platformCoreTools.productDocumentation };

export const isProductDocumentationToolSelected = (selectedTools: ToolSelection[]): boolean => {
  return selectedTools.some((selection) => toolMatchSelection(productDocumentationTool, selection));
};

/**
 * Returns tool selections with the product documentation tool added, preserving existing tools.
 */
export const appendProductDocumentationTool = (selectedTools: ToolSelection[]): ToolSelection[] => {
  if (isProductDocumentationToolSelected(selectedTools)) {
    return selectedTools;
  }

  const toolId = platformCoreTools.productDocumentation;
  const existingSelection = selectedTools.find(
    (selection) => !selection.tool_ids.includes(allToolsSelectionWildcard)
  );

  if (existingSelection && !existingSelection.tool_ids.includes(toolId)) {
    return selectedTools.map((selection) =>
      selection === existingSelection
        ? { ...selection, tool_ids: [...selection.tool_ids, toolId] }
        : selection
    );
  }

  return [...selectedTools, { tool_ids: [toolId] }];
};
