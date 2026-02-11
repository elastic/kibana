/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { agentIdRegexp, agentIdMaxLength } from '@kbn/agent-builder-common/agents';
import {
  isInProtectedNamespace,
  hasNamespaceName,
} from '@kbn/agent-builder-common/base/namespaces';
import { z } from '@kbn/zod';
import { isValidAgentAvatarColor } from '../../../utils/color';

export const agentFormSchema = z.object({
  id: z
    .string()
    .min(1, {
      message: i18n.translate('xpack.agentBuilder.agents.form.idRequired', {
        defaultMessage: 'Agent ID is required.',
      }),
    })
    .max(agentIdMaxLength, {
      message: i18n.translate('xpack.agentBuilder.agents.form.id.tooLongError', {
        defaultMessage: 'Agent ID must be 63 characters or less.',
      }),
    })
    .regex(agentIdRegexp, {
      message: i18n.translate('xpack.agentBuilder.agents.form.idInvalid', {
        defaultMessage:
          'Agent ID must start and end with a letter or number, and can only contain lowercase letters, numbers, hyphens, and underscores.',
      }),
    })
    .refine(
      (name) => !isInProtectedNamespace(name) && !hasNamespaceName(name),
      (name) => ({
        message: i18n.translate('xpack.agentBuilder.agents.form.id.protectedNamespaceError', {
          defaultMessage: 'Agent ID "{name}" uses a protected namespace.',
          values: { name },
        }),
      })
    ),
  name: z.string().min(1, {
    message: i18n.translate('xpack.agentBuilder.agents.form.nameRequired', {
      defaultMessage: 'Agent name is required.',
    }),
  }),
  description: z.string().min(1, {
    message: i18n.translate('xpack.agentBuilder.agents.form.descriptionRequired', {
      defaultMessage: 'Agent description is required.',
    }),
  }),
  labels: z.array(z.string()).optional(),
  avatar_color: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        return isValidAgentAvatarColor(value);
      },
      {
        message: i18n.translate('xpack.agentBuilder.agents.form.avatarColorInvalidError', {
          defaultMessage:
            'Please enter a valid hex color code. This can either be a three or six character hex value.',
        }),
      }
    ),
  avatar_symbol: z
    .string()
    .max(2, {
      message: i18n.translate('xpack.agentBuilder.agents.form.avatarSymbolMaxLengthError', {
        defaultMessage: 'Avatar symbol must be 2 characters or less.',
      }),
    })
    .optional(),
  configuration: z.object({
    instructions: z.string().optional(),
    tools: z.array(
      z.object({
        tool_ids: z.array(z.string()),
      })
    ),
  }),
});
