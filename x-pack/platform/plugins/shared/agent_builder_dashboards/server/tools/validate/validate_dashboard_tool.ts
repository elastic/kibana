/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from '../generate/attachment_state';
import { getErrorMessage } from '../generate/core';
import { getValidationSystemPrompt } from './rubric';

const validateDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .describe('Id of the dashboard attachment to validate.'),
  imageAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) Id of the screenshot image attachment returned by the capture_dashboard_screenshot browser tool. Omit for a configuration-only assessment (e.g. when no browser is attached).'
    ),
  focus: z
    .string()
    .max(2000)
    .optional()
    .describe(
      '(optional) Short free-text steer for the review, e.g. "the user complained the top row looks broken".'
    ),
});

const verdictSchema = z.object({
  verdict: z
    .enum(['pass', 'needs_improvement', 'fail'])
    .describe('Overall assessment of the dashboard.'),
  summary: z.string().describe('One-paragraph plain-language summary of the assessment.'),
  findings: z
    .array(
      z.object({
        panel_id: z
          .string()
          .optional()
          .describe(
            'Panel id from the dashboard configuration; omit for dashboard-level findings.'
          ),
        category: z.enum(['render_failure', 'no_data', 'layout', 'readability', 'semantic']),
        severity: z.enum(['low', 'medium', 'high']),
        issue: z.string().describe('What is wrong, in one or two sentences.'),
        suggested_fix: z
          .string()
          .describe('Concrete fix, phrased so it can be turned into a dashboard operation.'),
      })
    )
    .describe('Concrete findings; empty when the dashboard passes.'),
});

export type DashboardValidationVerdict = z.infer<typeof verdictSchema>;

/**
 * Compact projection handed to the judge as its coordinate system: every finding must
 * reference these panel ids. Kept separate from (and smaller than) the raw payload.
 */
const buildPanelMap = (data: DashboardAttachmentData) =>
  data.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        section_id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map(({ id, type, grid }) => ({ id, type, grid })),
      };
    }
    return { id: widget.id, type: widget.type, grid: widget.grid };
  });

/** Bound the raw config so a huge dashboard cannot blow up the judge prompt. */
const MAX_CONFIG_CHARS = 30_000;

const buildJudgeText = ({
  data,
  focus,
  hasImage,
}: {
  data: DashboardAttachmentData;
  focus?: string;
  hasImage: boolean;
}): string => {
  const rawConfig = JSON.stringify(data, null, 1);
  const boundedConfig =
    rawConfig.length > MAX_CONFIG_CHARS
      ? `${rawConfig.slice(0, MAX_CONFIG_CHARS)}\n... [truncated]`
      : rawConfig;

  return [
    `Dashboard title: ${data.title ?? '(untitled)'}`,
    data.description ? `Dashboard description: ${data.description}` : undefined,
    `\nPanel map (the panel ids findings must reference):\n${JSON.stringify(
      buildPanelMap(data),
      null,
      1
    )}`,
    `\nFull dashboard configuration:\n${boundedConfig}`,
    focus ? `\nReview focus requested by the caller: ${focus}` : undefined,
    hasImage
      ? '\nThe rendered dashboard screenshot is attached as an image.'
      : '\nNo screenshot is available; this is a configuration-only review.',
  ]
    .filter(Boolean)
    .join('\n');
};

const loadImageDataUrl = (
  attachments: AttachmentStateManager,
  imageAttachmentId: string
): string => {
  const record = attachments.getAttachmentRecord(imageAttachmentId);
  if (!record) {
    throw new Error(`Image attachment "${imageAttachmentId}" not found.`);
  }
  if (record.type !== AttachmentType.image) {
    throw new Error(`Attachment "${imageAttachmentId}" is of type "${record.type}", not an image.`);
  }
  const latestVersion = getLatestVersion(record);
  if (!latestVersion) {
    throw new Error(`Image attachment "${imageAttachmentId}" has no content.`);
  }
  return (latestVersion.data as ImageAttachmentData).content;
};

/**
 * LLM-judge validation of a generated dashboard.
 *
 * Loads the dashboard payload (and optionally a screenshot captured by the
 * `capture_dashboard_screenshot` browser tool) and has a judge model assess it against
 * the same authoring rubric dashboards are generated with. The verdict is advisory:
 * the agent decides whether and how to act on the findings via follow-up
 * `generate_dashboard` operations.
 */
export const validateDashboardTool = (): BuiltinSkillBoundedTool<
  typeof validateDashboardSchema
> => {
  return {
    id: dashboardTools.validateDashboard,
    type: ToolType.builtin,
    description: `Validate a generated dashboard with an LLM judge and get structured findings.

Pass the dashboard attachment id, plus the image attachment id returned by the capture_dashboard_screenshot browser tool when a screenshot is available (strongly recommended — only pixels reveal render failures and visual issues). Without an image the judgment is configuration-only.

Returns a verdict (pass | needs_improvement | fail), a summary, and per-panel findings with suggested fixes. Findings are advisory; apply fixes with ${dashboardTools.generateDashboard} operations.`,
    schema: validateDashboardSchema,
    handler: async (
      { dashboardAttachmentId, imageAttachmentId, focus },
      { logger, attachments, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, dashboardAttachmentId);
        if (!latestVersion) {
          throw new Error(`Dashboard attachment "${dashboardAttachmentId}" not found.`);
        }

        const imageDataUrl = imageAttachmentId
          ? loadImageDataUrl(attachments, imageAttachmentId)
          : undefined;
        const hasImage = imageDataUrl !== undefined;

        const { chatModel } = await modelProvider.getDefaultModel();
        const judge = chatModel.withStructuredOutput(verdictSchema, {
          name: 'report_dashboard_validation',
        });

        const text = buildJudgeText({ data: latestVersion.data, focus, hasImage });
        const verdict = await judge.invoke([
          ['system', getValidationSystemPrompt({ hasImage })],
          {
            role: 'user',
            content: [
              { type: 'text', text },
              ...(imageDataUrl ? [{ type: 'image_url', image_url: { url: imageDataUrl } }] : []),
            ],
          },
        ]);

        logger.info(
          `Dashboard validation verdict: ${verdict.verdict} (${verdict.findings.length} findings, ${
            hasImage ? 'with screenshot' : 'config-only'
          })`
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              tool_result_id: getToolResultId(),
              data: {
                mode: hasImage ? 'visual' : 'config_only',
                ...verdict,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in validate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to validate dashboard: ${errorMessage}`,
                metadata: { dashboardAttachmentId, imageAttachmentId },
              },
            },
          ],
        };
      }
    },
  };
};
