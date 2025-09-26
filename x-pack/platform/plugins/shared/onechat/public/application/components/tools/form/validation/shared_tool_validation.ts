/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { toolIdRegexp, toolIdMaxLength, isReservedToolId } from '@kbn/onechat-common/tools';
import { isInProtectedNamespace, hasNamespaceName } from '@kbn/onechat-common/base/namespaces';
import { z } from '@kbn/zod';

export const sharedI18nMessages = {
  toolId: {
    requiredError: i18n.translate('xpack.onechat.tools.newTool.validation.toolId.requiredError', {
      defaultMessage: 'Tool ID is required.',
    }),
    tooLongError: i18n.translate('xpack.onechat.tools.newTool.validation.toolId.tooLongError', {
      defaultMessage: 'Tool ID must be 63 characters or less.',
    }),
    formatError: i18n.translate('xpack.onechat.tools.newTool.validation.toolId.formatError', {
      defaultMessage:
        'Tool ID must start with a letter and contain only lowercase letters, numbers, and hyphens.',
    }),
    reservedError: (name: string) =>
      i18n.translate('xpack.onechat.tools.newTool.validation.toolId.reservedError', {
        defaultMessage: 'Tool ID "{name}" is reserved.',
        values: { name },
      }),
    protectedNamespaceError: (name: string) =>
      i18n.translate('xpack.onechat.tools.newTool.validation.toolId.protectedNamespaceError', {
        defaultMessage: 'Tool ID "{name}" uses a protected namespace.',
        values: { name },
      }),
  },
  description: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.newTool.validation.description.requiredError',
      {
        defaultMessage: 'Description is required.',
      }
    ),
  },
};

// Shared validation schemas for common fields
export const sharedValidationSchemas = {
  toolId: z
    .string()
    .min(1, { message: sharedI18nMessages.toolId.requiredError })
    .max(toolIdMaxLength, { message: sharedI18nMessages.toolId.tooLongError })
    .regex(toolIdRegexp, { message: sharedI18nMessages.toolId.formatError })
    .refine(
      (name) => !isReservedToolId(name),
      (name) => ({
        message: sharedI18nMessages.toolId.reservedError(name),
      })
    )
    .refine(
      (name) => !isInProtectedNamespace(name) && !hasNamespaceName(name),
      (name) => ({
        message: sharedI18nMessages.toolId.protectedNamespaceError(name),
      })
    ),

  description: z.string().min(1, { message: sharedI18nMessages.description.requiredError }),

  labels: z.array(z.string()),
};
