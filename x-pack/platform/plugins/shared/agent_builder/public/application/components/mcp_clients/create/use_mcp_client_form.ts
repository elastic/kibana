/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { useForm } from 'react-hook-form';
import {
  OAUTH_CLIENT_NAME_MAX_LENGTH,
  OAUTH_MAX_URI_LENGTH,
  OAUTH_REDIRECT_URIS_MAX_SIZE,
} from '@kbn/security-plugin/common/oauth';
import { zodResolver } from '../../../utils/zod_resolver';
import type { McpClientFormData } from './types';
import { NO_CLIENT_LOGO, RedirectUriType } from './types';

const mcpClientI18nMessages = {
  clientName: {
    requiredError: i18n.translate('xpack.agentBuilder.mcpClients.form.nameRequired', {
      defaultMessage: 'Client name is required',
    }),
    tooLongError: (maxLength: number) =>
      i18n.translate('xpack.agentBuilder.mcpClients.form.nameTooLong', {
        defaultMessage: 'Client name must be {maxLength} characters or fewer',
        values: { maxLength },
      }),
  },
  redirectUri: {
    requiredError: i18n.translate('xpack.agentBuilder.mcpClients.form.redirectUriRequired', {
      defaultMessage: 'At least one redirect URL is required',
    }),
    tooLongError: (maxLength: number) =>
      i18n.translate('xpack.agentBuilder.mcpClients.form.redirectUriTooLong', {
        defaultMessage: 'Redirect URL must be {maxLength} characters or fewer',
        values: { maxLength },
      }),
    tooManyError: (maxSize: number) =>
      i18n.translate('xpack.agentBuilder.mcpClients.form.redirectUrisTooMany', {
        defaultMessage:
          '{maxSize, plural, one {# redirect URL is allowed} other {No more than # redirect URLs are allowed}}',
        values: { maxSize },
      }),
    invalidUrlError: i18n.translate('xpack.agentBuilder.mcpClients.form.invalidUrl', {
      defaultMessage: 'Enter a valid URL',
    }),
  },
};

const localRedirectUriSchema = z.object({
  value: z
    .url({ error: mcpClientI18nMessages.redirectUri.invalidUrlError })
    .max(OAUTH_MAX_URI_LENGTH, {
      error: mcpClientI18nMessages.redirectUri.tooLongError(OAUTH_MAX_URI_LENGTH),
    }),
});

const remoteRedirectUriSchema = z.object({
  value: z
    .url({ protocol: /^https/, error: mcpClientI18nMessages.redirectUri.invalidUrlError })
    .max(OAUTH_MAX_URI_LENGTH, {
      error: mcpClientI18nMessages.redirectUri.tooLongError(OAUTH_MAX_URI_LENGTH),
    }),
});

const redirectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(RedirectUriType.LOCAL),
    uris: z
      .array(localRedirectUriSchema)
      .min(1, mcpClientI18nMessages.redirectUri.requiredError)
      .max(OAUTH_REDIRECT_URIS_MAX_SIZE, {
        error: mcpClientI18nMessages.redirectUri.tooManyError(OAUTH_REDIRECT_URIS_MAX_SIZE),
      }),
  }),
  z.object({
    type: z.literal(RedirectUriType.REMOTE),
    uris: z
      .array(remoteRedirectUriSchema)
      .min(1, mcpClientI18nMessages.redirectUri.requiredError)
      .max(1),
  }),
]);

const clientLogoSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('select'),
    id: z.string().min(1),
    dataUrl: z.string().min(1),
  }),
  z.object({
    type: z.literal('upload'),
    file: z.instanceof(File),
    dataUrl: z.string().min(1),
  }),
]);

const mcpClientFormSchema = z.object({
  clientName: z
    .string()
    .min(1, mcpClientI18nMessages.clientName.requiredError)
    .max(OAUTH_CLIENT_NAME_MAX_LENGTH, {
      error: mcpClientI18nMessages.clientName.tooLongError(OAUTH_CLIENT_NAME_MAX_LENGTH),
    }),
  clientLogo: clientLogoSchema,
  redirect: redirectSchema,
  isConfidential: z.boolean(),
});

export const DEFAULT_MCP_CLIENT_FORM_VALUES: McpClientFormData = {
  clientName: '',
  clientLogo: NO_CLIENT_LOGO,
  redirect: {
    type: RedirectUriType.LOCAL,
    uris: [{ value: 'http://localhost/callback' }, { value: 'http://localhost/oauth/callback' }],
  },
  isConfidential: false,
};

export const useMcpClientForm = () => {
  const form = useForm<McpClientFormData>({
    defaultValues: DEFAULT_MCP_CLIENT_FORM_VALUES,
    resolver: zodResolver<McpClientFormData>(mcpClientFormSchema),
    mode: 'onBlur',
  });

  return form;
};
