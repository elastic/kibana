/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  screenContextAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { i18n } from '@kbn/i18n';
import { SURFACE_LIMITS, clampText, hasText, toLine } from './surface_helpers';

/**
 * Creates the definition for the `screen_context` attachment type.
 */
export const createScreenContextAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.screenContext,
  ScreenContextAttachmentData
> => {
  return {
    id: AttachmentType.screenContext,
    validate: (input) => {
      const parseResult = screenContextAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatScreenContext(attachment.data) };
        },
      };
    },
    isReadonly: true,
    toSurfaceComposition: ({
      data: { app, url, description, time_range: timeRange, additional_data: additionalData },
    }) => {
      const items = [
        hasText(app) && {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.screenContext.surface.app',
            {
              defaultMessage: 'App',
            }
          ),
          value: app,
        },
        hasText(url) && {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.screenContext.surface.url',
            {
              defaultMessage: 'URL',
            }
          ),
          value: url,
        },
        hasText(description) && {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.screenContext.surface.description',
            { defaultMessage: 'Description' }
          ),
          value: description,
        },
        timeRange && {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.screenContext.surface.timeRange',
            { defaultMessage: 'Time range' }
          ),
          value: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.screenContext.surface.timeRangeValue',
            {
              defaultMessage: '{from} to {to}',
              values: { from: timeRange.from, to: timeRange.to },
            }
          ),
        },
        ...Object.entries(additionalData ?? {}).map(
          ([key, value]) => hasText(key) && hasText(value) && { label: key, value }
        ),
      ]
        .filter((item): item is { label: string; value: string } => Boolean(item))
        .slice(0, SURFACE_LIMITS.fieldItems)
        .map(({ label, value }) => ({
          label: toLine(label, SURFACE_LIMITS.fieldLabel),
          value: clampText(value, SURFACE_LIMITS.fieldValue),
        }));

      return {
        type: 'view',
        title: i18n.translate(
          'xpack.agentBuilderPlatform.attachments.screenContext.surface.title',
          {
            defaultMessage: 'Screen context',
          }
        ),
        body:
          items.length > 0
            ? [{ type: 'fields', items }]
            : [
                {
                  type: 'context',
                  items: [
                    {
                      text: i18n.translate(
                        'xpack.agentBuilderPlatform.attachments.screenContext.surface.empty',
                        { defaultMessage: 'No details of the screen were shared.' }
                      ),
                    },
                  ],
                },
              ],
      };
    },
    getAgentDescription: () =>
      `The user's current location in Kibana (app, URL, time range). Read it before answering questions about 'this page', 'here', or anything the user is currently viewing.`,
    getTools: () => [],
  };
};

const formatScreenContext = (data: ScreenContextAttachmentData): string => {
  const parts: string[] = [];

  if (data.app) {
    parts.push(`App: ${data.app}`);
  }
  if (data.url) {
    parts.push(`Url: ${data.url}`);
  }
  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }
  if (data.time_range) {
    parts.push(`Time range: ${data.time_range.from} to ${data.time_range.to}`);
  }
  if (data.additional_data) {
    parts.push(`Additional data: ${JSON.stringify(data.additional_data)}`);
  }

  return parts.join('\n');
};
