/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import type { Logger } from '@kbn/core/server';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { TaskRunNotification } from '@kbn/reporting-common/types';
import type { ScheduledReportTemplateVariables } from '../../types';

export const MAX_CUSTOM_TEMPLATE_VARIABLES = 50;
export const MAX_TEMPLATE_VARIABLE_VALUE_LENGTH = 1000;
export const MAX_SUMMARY_MARKDOWN_LENGTH = 10000;

const SUMMARY_VARIABLE = 'summary';
const VARIABLE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const UNSAFE_LINK_REGEX = /\]\(\s*(?:javascript|data|vbscript):/gi;

export const sanitizeSummaryMarkdown = (summaryMarkdown: string): string =>
  summaryMarkdown
    .slice(0, MAX_SUMMARY_MARKDOWN_LENGTH)
    .replace(/</g, '&lt;')
    .replace(UNSAFE_LINK_REGEX, '](#');

const getCustomTemplateVariables = (
  logger: Logger,
  customVariables: TaskRunNotification['templateVariables'],
  reservedNames: string[]
): Record<string, string | number | boolean> => {
  const result: Record<string, string | number | boolean> = {};
  if (!customVariables) return result;

  for (const [name, value] of Object.entries(customVariables)) {
    if (Object.keys(result).length >= MAX_CUSTOM_TEMPLATE_VARIABLES) {
      logger.warn(
        `Ignoring scheduled report email variables beyond the limit of ${MAX_CUSTOM_TEMPLATE_VARIABLES}`
      );
      break;
    }
    const isSupportedValue = ['string', 'number', 'boolean'].includes(typeof value);
    if (!VARIABLE_NAME_REGEX.test(name) || reservedNames.includes(name) || !isSupportedValue) {
      logger.warn(`Ignoring invalid scheduled report email variable "${name}"`);
      continue;
    }
    result[name] =
      typeof value === 'string' ? value.slice(0, MAX_TEMPLATE_VARIABLE_VALUE_LENGTH) : value;
  }
  return result;
};

interface RenderScheduledReportEmailArgs {
  logger: Logger;
  subjectTemplate: string;
  messageTemplate: string;
  baseVariables: ScheduledReportTemplateVariables;
  notification?: TaskRunNotification;
}

/**
 * Renders the subject and message of a scheduled report email. Variables from the export type
 * are escaped like the built-in ones; `{{summary}}` is only available in the message.
 */
export const renderScheduledReportEmail = ({
  logger,
  subjectTemplate,
  messageTemplate,
  baseVariables,
  notification,
}: RenderScheduledReportEmailArgs): { subject: string; message: string } => {
  const customVariables = getCustomTemplateVariables(logger, notification?.templateVariables, [
    ...Object.keys(baseVariables),
    SUMMARY_VARIABLE,
  ]);
  const variables = { ...customVariables, ...baseVariables };

  const subject = renderMustacheString(
    logger,
    subjectTemplate,
    { ...variables, [SUMMARY_VARIABLE]: '' },
    'none'
  );

  // The markdown escaping would flatten the summary, so it is swapped in after rendering.
  const summaryPlaceholder = `summary${randomBytes(16).toString('hex')}`;
  const summary = notification?.summaryMarkdown
    ? sanitizeSummaryMarkdown(notification.summaryMarkdown)
    : '';
  const renderedMessage = renderMustacheString(
    logger,
    messageTemplate,
    { ...variables, [SUMMARY_VARIABLE]: summary ? summaryPlaceholder : '' },
    'markdown'
  );
  const message = renderedMessage.split(summaryPlaceholder).join(summary);

  return { subject, message };
};
