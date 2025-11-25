/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolTypeInfo } from '../../../../common/tools';
import type { AnyToolTypeDefinition } from '../tool_types/definitions';
import { isBuiltinDefinition, isEnabledDefinition } from '../tool_types/definitions';

export const getToolTypeInfo = (definitions: AnyToolTypeDefinition[]): ToolTypeInfo[] => {
  const typeInfos: ToolTypeInfo[] = [];

  for (const definition of definitions) {
    if (isEnabledDefinition(definition)) {
      typeInfos.push({
        type: definition.toolType,
        create: true,
      });
    }
    if (isBuiltinDefinition(definition)) {
      typeInfos.push({
        type: definition.toolType,
        create: false,
      });
    }
  }

  return typeInfos;
};
