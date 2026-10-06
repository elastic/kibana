/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GenAIMessagePart,
  GenAITextPart,
  GenAIToolCallPart,
  GenAIToolCallResponsePart,
} from '../types';
export declare function isTextPart(part: GenAIMessagePart): part is GenAITextPart;
export declare function isToolCallPart(part: GenAIMessagePart): part is GenAIToolCallPart;
export declare function isToolCallResponsePart(
  part: GenAIMessagePart
): part is GenAIToolCallResponsePart;
