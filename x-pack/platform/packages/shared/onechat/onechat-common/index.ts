/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { OnechatEvent } from './src/events';
export {
  type ToolDescriptor,
  type ToolDescriptorMeta,
  type PlainIdToolIdentifier,
  type SerializedToolIdentifier,
  type StructuredToolIdentifier,
  type ToolIdentifier,
  ToolSourceType,
  isSerializedToolIdentifier,
  isStructuredToolIdentifier,
  isPlainToolIdentifier,
  toStructuredToolIdentifier,
  toSerializedToolIdentifier,
  createBuiltinToolId,
  builtinSourceId,
} from './src/tools';
export {
  OnechatErrorCode,
  OnechatErrorUtils,
  isInternalError,
  isToolNotFoundError,
  isOnechatError,
  createInternalError,
  createToolNotFoundError,
  type OnechatError,
  type OnechatInternalError,
  type OnechatToolNotFoundError,
} from './src/errors';
