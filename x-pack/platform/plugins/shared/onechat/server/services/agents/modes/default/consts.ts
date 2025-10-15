/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const openingTag = (tagName: string) => `<${tagName}>`;
const closingTag = (tagName: string) => `</${tagName}>`;

export const toolReasoningTagName = 'tool_reasoning';
export const toolReasoningOpeningTag = openingTag(toolReasoningTagName);
export const toolReasoningClosingTag = closingTag(toolReasoningTagName);
