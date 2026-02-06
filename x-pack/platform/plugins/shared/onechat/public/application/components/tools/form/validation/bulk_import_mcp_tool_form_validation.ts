/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isInProtectedNamespace, hasNamespaceName } from '@kbn/onechat-common/base/namespaces';
import { toolIdRegexp, toolIdMaxLength } from '@kbn/onechat-common/tools';
import { useQueryClient } from '@kbn/react-query';
import { z } from '@kbn/zod';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';
import { queryKeys } from '../../../../query_keys';

export const bulkImportMcpI18nMessages = {
  connectorId: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.connectorId.requiredError',
      {
        defaultMessage: 'MCP server is required.',
      }
    ),
  },
  tools: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.tools.requiredError',
      {
        defaultMessage: 'At least one tool is required.',
      }
    ),
  },
  namespace: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.namespace.requiredError',
      {
        defaultMessage: 'Namespace is required.',
      }
    ),
    tooLongError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.namespace.tooLongError',
      {
        defaultMessage: 'Namespace must be {maxLength} characters or less.',
        values: { maxLength: toolIdMaxLength },
      }
    ),
    formatError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.namespace.formatError',
      {
        defaultMessage:
          'Namespace must start with a letter and contain only lowercase letters, numbers, and hyphens.',
      }
    ),
    protectedNamespaceError: (name: string) =>
      i18n.translate(
        'xpack.onechat.tools.bulkImportMcp.validation.namespace.protectedNamespaceError',
        {
          defaultMessage: '"{name}" is a protected namespace and cannot be used.',
          values: { name },
        }
      ),
    conflictError: i18n.translate(
      'xpack.onechat.tools.bulkImportMcp.validation.namespace.conflictError',
      {
        defaultMessage: 'This namespace is already in use by existing tools.',
      }
    ),
  },
};

export const useBulkImportMcpToolFormValidationSchema = () => {
  const { toolsService } = useOnechatServices();
  const queryClient = useQueryClient();

  return z
    .object({
      connectorId: z
        .string()
        .min(1, { message: bulkImportMcpI18nMessages.connectorId.requiredError }),
      tools: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
          })
        )
        .min(1, { message: bulkImportMcpI18nMessages.tools.requiredError }),
      namespace: z
        .string()
        .min(1, { message: bulkImportMcpI18nMessages.namespace.requiredError })
        .max(toolIdMaxLength, { message: bulkImportMcpI18nMessages.namespace.tooLongError })
        .regex(toolIdRegexp, { message: bulkImportMcpI18nMessages.namespace.formatError })
        .refine(
          (name) => !isInProtectedNamespace(name) && !hasNamespaceName(name),
          (name) => ({
            message: bulkImportMcpI18nMessages.namespace.protectedNamespaceError(name),
          })
        ),
      labels: z.array(z.string()),
    })
    .superRefine(async (data, ctx) => {
      if (data.namespace.length > 0 && data.connectorId.length > 0) {
        const { isValid } = await queryClient.fetchQuery({
          queryKey: queryKeys.tools.namespace.validate(data.namespace, data.connectorId),
          queryFn: () =>
            toolsService.validateNamespace({
              namespace: data.namespace,
              connectorId: data.connectorId,
            }),
          staleTime: 0,
        });
        if (!isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: bulkImportMcpI18nMessages.namespace.conflictError,
            path: ['namespace'],
          });
        }
      }
    });
};
