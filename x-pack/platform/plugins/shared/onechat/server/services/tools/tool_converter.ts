/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolType } from '@kbn/onechat-common';
import type { Runner } from '@kbn/onechat-server';
import type { AnyToolTypeDefinition, ToolTypeDefinition } from './tool_types';
import { convertTool } from './builtin/converter';
import { toExecutableTool } from './utils/tool_conversion';
import type { ToolDynamicPropsContext } from './tool_types/definitions';
import { type BuiltinToolTypeDefinition, isDisabledDefinition } from './tool_types/definitions';
import { ToolAvailabilityCache } from './builtin/availability_cache';

// convertAttachmentTool(tool: AttachmentScopedTool): Promise<ExecutableTool>;


