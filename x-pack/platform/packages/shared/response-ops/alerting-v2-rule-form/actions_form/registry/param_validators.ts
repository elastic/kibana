/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEmailAddresses } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';
import { isDynamicValue, isLiquidTagValue, isVariableValue } from '@kbn/workflows-yaml';
import type { InlineActionParamError } from '../types';

type Params = Readonly<Record<string, unknown>>;

const RECIPIENT_KEYS = ['to', 'cc', 'bcc'] as const;

const fieldRequired = (field: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.fieldRequired', {
    defaultMessage: '{field} is required.',
    values: { field },
  });

const fieldNotText = (field: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.fieldNotText', {
    defaultMessage: '{field} must be a string. Wrap template expressions in quotes.',
    values: { field },
  });

const fieldNotEmailList = (field: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.fieldNotEmailList', {
    defaultMessage: '{field} must be a list of email addresses.',
    values: { field },
  });

const emailEntriesNotText = (field: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.emailEntriesNotText', {
    defaultMessage: '{field} entries must be strings. Wrap template expressions in quotes.',
    values: { field },
  });

const invalidEmailAddresses = (field: string, addresses: string[]): string =>
  i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.actionForm.validation.invalidEmailAddresses',
    {
      defaultMessage: '{field} has invalid email addresses: {addresses}.',
      values: { field, addresses: addresses.join(', ') },
    }
  );

const recipientRequired = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.recipientRequired', {
    defaultMessage: 'Add at least one recipient to to, cc, or bcc.',
  });

/**
 * Templated values are resolved when the workflow runs, so the workflow schema
 * does not check them either.
 */
export const isTemplateValue = (value: unknown): boolean =>
  isVariableValue(value) || isDynamicValue(value) || isLiquidTagValue(value);

const isBlank = (value: string): boolean => value.trim() === '';

export const validateRequiredText = (params: Params, key: string): InlineActionParamError[] => {
  const value = params[key];
  if (value === undefined || value === null || (typeof value === 'string' && isBlank(value))) {
    return [{ key, message: fieldRequired(key) }];
  }
  if (typeof value !== 'string') {
    return [{ key, message: fieldNotText(key) }];
  }
  return [];
};

const getInvalidAddresses = (addresses: string[]): string[] =>
  validateEmailAddresses(
    null,
    addresses.filter((address) => !isLiquidTagValue(address)),
    { treatMustacheTemplatesAsValid: true }
  )
    .filter(({ valid }) => !valid)
    .map(({ address }) => address);

interface RecipientListResult {
  readonly hasRecipient: boolean;
  readonly error?: InlineActionParamError;
}

const validateRecipientList = (
  key: (typeof RECIPIENT_KEYS)[number],
  value: unknown
): RecipientListResult => {
  if (isTemplateValue(value)) {
    return { hasRecipient: true };
  }
  if (key === 'to' && (value === undefined || value === null)) {
    return { hasRecipient: false, error: { key, message: fieldRequired(key) } };
  }
  if (value === undefined) {
    return { hasRecipient: false };
  }
  // A blank `cc:` / `bcc:` parses as null, which the step schema rejects too.
  if (!Array.isArray(value)) {
    return { hasRecipient: false, error: { key, message: fieldNotEmailList(key) } };
  }
  if (!value.every((entry): entry is string => typeof entry === 'string')) {
    return { hasRecipient: false, error: { key, message: emailEntriesNotText(key) } };
  }

  const addresses = value.filter((entry) => !isBlank(entry));
  const invalidAddresses = getInvalidAddresses(addresses);
  return {
    hasRecipient: addresses.length > 0,
    error:
      invalidAddresses.length > 0
        ? { key, message: invalidEmailAddresses(key, invalidAddresses) }
        : undefined,
  };
};

/**
 * Mirrors the `email` workflow step schema (`to` is a required list, `cc`/`bcc`
 * optional lists) and the email connector, which needs at least one recipient,
 * valid addresses, a subject and a message.
 */
export const validateEmailParams = (params: Params): InlineActionParamError[] => {
  const results = RECIPIENT_KEYS.map((key) => validateRecipientList(key, params[key]));
  const errors = results.flatMap(({ error }) => (error ? [error] : []));

  if (
    !results.some(({ hasRecipient }) => hasRecipient) &&
    !errors.some(({ key }) => key === 'to')
  ) {
    errors.push({ key: 'to', message: recipientRequired() });
  }

  return [
    ...errors,
    ...validateRequiredText(params, 'subject'),
    ...validateRequiredText(params, 'message'),
  ];
};

/** Mirrors the `slack2.sendMessage` workflow step schema. */
export const validateSlackParams = (params: Params): InlineActionParamError[] => [
  ...validateRequiredText(params, 'channel'),
  ...validateRequiredText(params, 'text'),
];
