/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { AnyToolTypeDefinition } from '../tool_types/definitions';
import { getToolTypeInfo } from './get_tool_type_info';

const enabled = (toolType: ToolType): AnyToolTypeDefinition =>
  ({ toolType } as AnyToolTypeDefinition);

describe('getToolTypeInfo', () => {
  const definitions = [enabled(ToolType.esql), enabled(ToolType.workflow)];

  it('marks the workflow type creatable by default', () => {
    const infos = getToolTypeInfo(definitions);
    expect(infos).toContainEqual({ type: ToolType.workflow, create: true });
    expect(infos).toContainEqual({ type: ToolType.esql, create: true });
  });

  it('marks the workflow type non-creatable when workflowToolsCreatable is false', () => {
    const infos = getToolTypeInfo(definitions, { workflowToolsCreatable: false });
    expect(infos).toContainEqual({ type: ToolType.workflow, create: false });
    // other tool types are unaffected
    expect(infos).toContainEqual({ type: ToolType.esql, create: true });
  });
});
