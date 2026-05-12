/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type ScopedModel } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { InferenceConnectorType, MessageRole, type ToolSchema } from '@kbn/inference-common';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import {
  DASHBOARD_SCREENSHOT_APP_ID,
  DASHBOARD_SCREENSHOT_CONTEXT_KEY,
  dashboardTools,
} from '../../../common';
import { getErrorMessage, retrieveLatestVersion } from '../manage_dashboard/utils';

const inspectDashboardSchema = z.object({
  dashboardAttachmentId: z.string().describe('The dashboard attachment ID to inspect visually.'),
  instructions: z
    .string()
    .optional()
    .describe('Optional user-specific review criteria to apply during visual inspection.'),
  includeScreenshot: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include the captured PNG as base64 in the tool output.'),
});

const dashboardInspectionSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'number' },
    summary: { type: 'string' },
    criticalIssues: { type: 'array', items: { type: 'string' } },
    panelObservations: { type: 'array', items: { type: 'string' } },
    layoutIssues: { type: 'array', items: { type: 'string' } },
    suggestedManageDashboardOperations: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary'],
} as const satisfies ToolSchema;

export interface InspectDashboardToolDeps {
  getScreenshotting: () => Promise<ScreenshottingStart>;
  getServerBaseUrl: () => Promise<string>;
}

export const inspectDashboardTool = ({
  getScreenshotting,
  getServerBaseUrl,
}: InspectDashboardToolDeps): BuiltinSkillBoundedTool<typeof inspectDashboardSchema> => {
  return {
    id: dashboardTools.inspectDashboard,
    type: ToolType.builtin,
    description: `Visually inspect a dashboard attachment by rendering it and analyzing a screenshot.

This read-only tool catches visual issues such as empty charts, clipped labels, overlapping panels,
poor density, unreadable legends, and layout problems. Use it after creating or substantially updating
a non-trivial dashboard before giving a final answer.`,
    schema: inspectDashboardSchema,
    handler: async (
      { dashboardAttachmentId, instructions, includeScreenshot },
      { logger, attachments, modelProvider, request }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, dashboardAttachmentId);
        if (!latestVersion) {
          throw new Error(`Dashboard attachment "${dashboardAttachmentId}" not found.`);
        }

        const { screenshotBase64, renderErrors } = await captureDashboardScreenshot({
          dashboardData: latestVersion.data,
          dashboardAttachmentId,
          getScreenshotting,
          getServerBaseUrl,
          logger,
          request,
        });

        const model = await modelProvider.getDefaultModel();
        const imageSourceData = getImageSourceData({
          base64: screenshotBase64,
          connectorType: model.connector.type,
        });

        const prompt = buildInspectionPrompt({
          dashboardData: latestVersion.data,
          renderErrors,
          instructions,
        });
        const inspectionResult = await inspectScreenshotWithModel({
          imageSourceData,
          prompt,
          model,
          logger,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              tool_result_id: getToolResultId(),
              data: {
                dashboardAttachmentId,
                inspection: inspectionResult.inspection,
                structuredOutput: inspectionResult.structuredOutput,
                fallbackReason: inspectionResult.fallbackReason,
                renderErrors,
                screenshot: includeScreenshot ? screenshotBase64 : undefined,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in inspect_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to inspect dashboard: ${errorMessage}`,
                metadata: { dashboardAttachmentId },
              },
            },
          ],
        };
      }
    },
  };
};

const inspectScreenshotWithModel = async ({
  imageSourceData,
  prompt,
  model,
  logger,
}: {
  imageSourceData: string;
  prompt: string;
  model: ScopedModel;
  logger: Logger;
}): Promise<{
  inspection: unknown;
  structuredOutput: boolean;
  fallbackReason?: string;
}> => {
  const system = 'You are a Kibana dashboard design reviewer. Be concise and actionable.';
  const imageMessage = {
    role: MessageRole.User as const,
    content: [
      {
        type: 'image' as const,
        source: {
          data: imageSourceData,
          mimeType: 'image/png',
        },
      },
    ],
  };

  try {
    const response = await model.inferenceClient.output({
      id: 'inspect_dashboard',
      system: `${system} Return JSON that follows the requested schema.`,
      input: prompt,
      previousMessages: [imageMessage],
      schema: dashboardInspectionSchema,
      retry: { onValidationError: 2 },
    });

    return {
      inspection: response.output,
      structuredOutput: true,
    };
  } catch (error) {
    const fallbackReason = getErrorMessage(error);
    logger.warn(`Structured dashboard inspection failed, falling back to text: ${fallbackReason}`);
    const response = await model.inferenceClient.chatComplete({
      system,
      messages: [
        {
          role: MessageRole.User,
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                data: imageSourceData,
                mimeType: 'image/png',
              },
            },
          ],
        },
      ],
    });

    return {
      inspection: {
        summary: response.content ?? 'The model returned no inspection text.',
      },
      structuredOutput: false,
      fallbackReason,
    };
  }
};

const getImageSourceData = ({
  base64,
  connectorType,
}: {
  base64: string;
  connectorType: InferenceConnectorType;
}): string => {
  switch (connectorType) {
    case InferenceConnectorType.Bedrock:
    case InferenceConnectorType.Gemini:
      return base64;
    case InferenceConnectorType.OpenAI:
    case InferenceConnectorType.Inference:
      return `data:image/png;base64,${base64}`;
  }
};

const captureDashboardScreenshot = async ({
  dashboardData,
  dashboardAttachmentId,
  getScreenshotting,
  getServerBaseUrl,
  logger,
  request,
}: {
  dashboardData: DashboardAttachmentData;
  dashboardAttachmentId: string;
  getScreenshotting: () => Promise<ScreenshottingStart>;
  getServerBaseUrl: () => Promise<string>;
  logger: Logger;
  request: KibanaRequest;
}): Promise<{ screenshotBase64: string; renderErrors: string[] }> => {
  const [screenshotting, serverBaseUrl] = await Promise.all([
    getScreenshotting(),
    getServerBaseUrl(),
  ]);
  const result = await lastValueFrom(
    screenshotting.getScreenshots({
      format: 'png',
      urls: [
        [
          `${serverBaseUrl}/app/${DASHBOARD_SCREENSHOT_APP_ID}`,
          {
            [DASHBOARD_SCREENSHOT_CONTEXT_KEY]: dashboardData,
          },
        ],
      ],
      layout: {
        id: 'preserve_layout',
        dimensions: { width: 1440, height: 1200 },
      },
      taskInstanceFields: {
        startedAt: new Date(),
        retryAt: new Date(Date.now() + 120000),
      },
      request,
      logger,
    })
  );

  const firstResult = result.results[0];
  const firstScreenshot = firstResult?.screenshots[0];
  if (!firstScreenshot) {
    throw new Error(`Screenshot capture returned no image for "${dashboardAttachmentId}".`);
  }

  return {
    screenshotBase64: firstScreenshot.data.toString('base64'),
    renderErrors: firstResult.renderErrors ?? [],
  };
};

const buildInspectionPrompt = ({
  dashboardData,
  renderErrors,
  instructions,
}: {
  dashboardData: DashboardAttachmentData;
  renderErrors: string[];
  instructions?: string;
}): string => {
  return `Inspect this Kibana dashboard screenshot for visual quality and usefulness.

Dashboard metadata:
${JSON.stringify(
  {
    title: dashboardData.title,
    description: dashboardData.description,
    panels: dashboardData.panels,
  },
  null,
  2
)}

Screenshot render errors:
${renderErrors.length > 0 ? renderErrors.join('\n') : 'None'}

Additional user instructions:
${instructions?.trim() || 'None'}

Focus on issues that can be fixed by calling manage_dashboard: panel layout, size, grouping, titles, empty or unreadable charts, and markdown guidance.`;
};
