/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/agent-builder-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';

/**
 * Strips fields that aren't part of the create-tool API payload (server-derived or read-only).
 */
export const toCreatePayload = <T extends ToolDefinition>(tool: T): CreateToolPayload =>
  omit(tool, ['readonly', 'experimental']) as CreateToolPayload;

/**
 * Strips fields that aren't part of the update-tool API payload (immutable or server-derived).
 */
export const toUpdatePayload = <T extends ToolDefinition>(tool: T): UpdateToolPayload =>
  omit(tool, ['id', 'type', 'readonly', 'experimental']) as UpdateToolPayload;
