/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CustomResolutionRuleTypeName = 'entity-resolution-custom-rule';

/** Prefix for custom-rule entries in the automated-resolution task state. */
export const CUSTOM_RULE_STATE_KEY_PREFIX = 'custom:';

export const customRuleStateKey = (ruleId: string): string =>
  `${CUSTOM_RULE_STATE_KEY_PREFIX}${ruleId}`;

export const MAX_CUSTOM_RULE_NAME_LENGTH = 256;
export const MAX_CUSTOM_RULE_EXPRESSION_LENGTH = 2048;
export const MAX_CUSTOM_RULE_NAMESPACES = 20;
export const MAX_CUSTOM_RULE_NAMESPACE_LENGTH = 64;
export const MAX_CUSTOM_RULE_ID_LENGTH = 100;

/**
 * `entity.namespace` comes from free-form `event.module` or `data_stream.dataset`,
 * so only characters that can't break out of a quoted list are allowed.
 */
export const CUSTOM_RULE_NAMESPACE_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** Match-group pages a preview reads before it reports `truncated`. */
export const PREVIEW_MAX_PAGES = 10;
export const PREVIEW_SAMPLE_SIZE = 20;

export const DEFAULT_DECLINE_SAME_NAMESPACE_DUPLICATES = true;
