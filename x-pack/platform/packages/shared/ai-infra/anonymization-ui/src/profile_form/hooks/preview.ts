/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule, RegexRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
  type FieldRuleAction,
} from './field_rule_actions';
import { isObjectRecord } from '../../common/utils/is_object_record';

const UNSAFE_PATH_PARTS = new Set(['__proto__', 'prototype', 'constructor']);

const hasUnsafePathPart = (path: string): boolean =>
  path.split('.').some((part) => UNSAFE_PATH_PARTS.has(part));

const hasOwnPath = (value: Record<string, unknown>, key: string): boolean =>
  Object.hasOwn(value, key);

export interface PreviewRow {
  field: string;
  action: FieldRuleAction;
  originalValue: unknown;
  anonymizedValue: unknown;
}

const getByPath = (document: Record<string, unknown>, path: string): unknown => {
  if (hasUnsafePathPart(path)) {
    return undefined;
  }

  // Prefer exact key match first to support flattened documents that use literal dots in keys.
  if (hasOwnPath(document, path)) {
    return document[path];
  }

  const parts = path.split('.');
  let current: unknown = document;

  for (const part of parts) {
    if (UNSAFE_PATH_PARTS.has(part) || !isObjectRecord(current) || !hasOwnPath(current, part)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
};

const setByPath = (document: Record<string, unknown>, path: string, value: unknown): boolean => {
  if (hasUnsafePathPart(path)) {
    return false;
  }

  // Prefer exact key match first to keep updates aligned with flattened key storage.
  if (hasOwnPath(document, path)) {
    document[path] = value;
    return true;
  }

  const parts = path.split('.');
  let current: unknown = document;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (UNSAFE_PATH_PARTS.has(part) || !isObjectRecord(current) || !hasOwnPath(current, part)) {
      return false;
    }

    if (index === parts.length - 1) {
      current[part] = value;
      return true;
    }

    current = current[part];
  }

  return false;
};

const unsetByPath = (document: Record<string, unknown>, path: string): boolean => {
  if (hasUnsafePathPart(path)) {
    return false;
  }

  // Prefer exact key match first to keep updates aligned with flattened key storage.
  if (hasOwnPath(document, path)) {
    delete document[path];
    return true;
  }

  const parts = path.split('.');
  let current: unknown = document;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (UNSAFE_PATH_PARTS.has(part) || !isObjectRecord(current) || !hasOwnPath(current, part)) {
      return false;
    }

    if (index === parts.length - 1) {
      delete current[part];
      return true;
    }

    current = current[part];
  }

  return false;
};

const toToken = (rule: FieldRule): string => `<${rule.entityClass ?? 'MISC'}>`;

const toAction = (rule: FieldRule): FieldRuleAction => {
  if (!rule.allowed) {
    return FIELD_RULE_ACTION_DENY;
  }

  if (rule.anonymized) {
    return FIELD_RULE_ACTION_ANONYMIZE;
  }

  return FIELD_RULE_ACTION_ALLOW;
};

const toRegexToken = (rule: RegexRule): string => `<${rule.entityClass}>`;

const toGlobalRegExp = (pattern: string): RegExp | undefined => {
  try {
    const parsed = /^\/(.+)\/([a-z]*)$/.exec(pattern);
    if (parsed) {
      const source = parsed[1];
      const flags = parsed[2].includes('g') ? parsed[2] : `${parsed[2]}g`;
      return new RegExp(source, flags);
    }

    return new RegExp(pattern, 'g');
  } catch {
    return undefined;
  }
};

const applyRegexRulesToText = (value: string, regexRules: RegexRule[]): string =>
  regexRules.reduce((nextValue, rule) => {
    if (!rule.enabled) {
      return nextValue;
    }

    const regex = toGlobalRegExp(rule.pattern.trim());
    if (!regex) {
      return nextValue;
    }

    return nextValue.replace(regex, toRegexToken(rule));
  }, value);

function applyRegexRulesToValue(
  value: Record<string, unknown>,
  regexRules: RegexRule[]
): Record<string, unknown>;
function applyRegexRulesToValue(value: unknown[], regexRules: RegexRule[]): unknown[];
function applyRegexRulesToValue(value: string, regexRules: RegexRule[]): string;
function applyRegexRulesToValue(value: unknown, regexRules: RegexRule[]): unknown;
function applyRegexRulesToValue(value: unknown, regexRules: RegexRule[]): unknown {
  if (typeof value === 'string') {
    return applyRegexRulesToText(value, regexRules);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => applyRegexRulesToValue(entry, regexRules));
  }

  if (isObjectRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        applyRegexRulesToValue(nested, regexRules),
      ])
    );
  }

  return value;
}

export const buildLocalPreviewRows = ({
  document,
  fieldRules,
  regexRules = [],
}: {
  document: Record<string, unknown>;
  fieldRules: FieldRule[];
  regexRules?: RegexRule[];
}): PreviewRow[] =>
  fieldRules.map((rule) => {
    const originalValue = getByPath(document, rule.field);
    const action = toAction(rule);

    if (action === FIELD_RULE_ACTION_DENY) {
      return {
        field: rule.field,
        action,
        originalValue,
        anonymizedValue: '[DENIED]',
      };
    }

    if (action === FIELD_RULE_ACTION_ANONYMIZE) {
      return {
        field: rule.field,
        action,
        originalValue,
        anonymizedValue: toToken(rule),
      };
    }

    return {
      field: rule.field,
      action,
      originalValue,
      anonymizedValue: applyRegexRulesToValue(originalValue, regexRules),
    };
  });

export const getPreviewDisplayValue = ({
  row,
  showAnonymizedValues,
  resolveText,
}: {
  row: PreviewRow;
  showAnonymizedValues: boolean;
  resolveText?: (value: string) => string;
}): unknown => {
  const value = showAnonymizedValues ? row.anonymizedValue : row.originalValue;
  if (showAnonymizedValues || typeof value !== 'string' || !resolveText) {
    return value;
  }
  return resolveText(value);
};

export const buildLocalPreviewDocument = ({
  document,
  fieldRules,
  regexRules = [],
}: {
  document: Record<string, unknown>;
  fieldRules: FieldRule[];
  regexRules?: RegexRule[];
}): Record<string, unknown> => {
  const nextDocument = applyRegexRulesToValue(structuredClone(document), regexRules);

  for (const rule of fieldRules) {
    const originalValue = getByPath(nextDocument, rule.field);
    if (originalValue === undefined) {
      continue;
    }

    const action = toAction(rule);
    if (action === FIELD_RULE_ACTION_DENY) {
      unsetByPath(nextDocument, rule.field);
      continue;
    }

    if (action === FIELD_RULE_ACTION_ANONYMIZE) {
      setByPath(nextDocument, rule.field, toToken(rule));
    }
  }

  return nextDocument;
};
