/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import { isRecord } from '../evaluator_utils';
import { extractVisualizations } from '../extract_visualization';

/** A custom content panel as stored in the visualization attachment. */
export interface StoredCustomContent {
  /** Absent for a static panel. */
  esql?: string;
  template?: string;
  height?: number;
}

export interface CustomContentTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  /** The panel after the last turn; undefined when the agent created none. */
  after?: StoredCustomContent;
  /** The panel after the first stored version; equals `after` unless an edit followed. */
  before?: StoredCustomContent;
  /** Stored versions of the panel's attachment; 1 means no edit was ever stored. */
  versionCount: number;
  /** Where the agent stored the panel: a standalone visualization, a dashboard, or nowhere. */
  storedIn: 'visualization' | 'dashboard' | 'none';
  /** Tool ids the agent called, in order, for diagnosing a run that produced no panel. */
  toolIds: string[];
  /** Renderers of other visualizations the agent created instead (`lens`, `vega`). */
  otherRenderers: string[];
  agentTraceId?: string;
  traceId?: string;
  turns: number;
  prompts: unknown[];
}

/** Reads the fields the evaluators score from one stored version of a visualization attachment. */
export const toStoredCustomContent = (data: unknown): StoredCustomContent | undefined => {
  if (!isRecord(data) || data.renderer !== 'custom_content') {
    return undefined;
  }
  const { esql, visualization } = data;
  const stored: StoredCustomContent = {};
  if (typeof esql === 'string' && esql.trim().length > 0) {
    stored.esql = esql;
  }
  if (isRecord(visualization)) {
    if (typeof visualization.template === 'string') {
      stored.template = visualization.template;
    }
    if (typeof visualization.height === 'number') {
      stored.height = visualization.height;
    }
  }
  return stored;
};

/** Id of the custom content attachment the agent wrote last, from the create_visualization results. */
export const getLastCustomContentAttachmentId = (
  steps: Array<Record<string, unknown>> | undefined
): string | undefined =>
  extractVisualizations({ steps })
    .filter(({ renderer, attachmentId }) => renderer === 'custom_content' && attachmentId)
    .map(({ attachmentId }) => attachmentId)
    .pop();

/** The first and latest stored versions of one custom content attachment. */
export const readStoredCustomContent = (
  conversation: Conversation,
  attachmentId: string
): { before?: StoredCustomContent; after?: StoredCustomContent; versionCount: number } => {
  const attachment = conversation.attachments?.find(
    ({ id, type }) => id === attachmentId && type === VISUALIZATION_ATTACHMENT_TYPE
  );
  if (!attachment) {
    return { versionCount: 0 };
  }
  return {
    before: toStoredCustomContent(attachment.versions[0]?.data),
    after: toStoredCustomContent(getLatestVersion(attachment)?.data),
    versionCount: attachment.versions.length,
  };
};

const GENERATE_DASHBOARD_TOOL_ID = 'platform.dashboard.generate_dashboard';
const CUSTOM_CONTENT_PANEL_TYPE = 'custom_content';

/**
 * Id of the dashboard attachment the agent wrote last. The tool result only carries a summary; the
 * panels live on the conversation attachment.
 */
export const getLastWrittenDashboardId = (
  steps: Array<Record<string, unknown>> | undefined
): string | undefined => {
  for (const step of [...(steps ?? [])].reverse()) {
    if (step.type !== 'tool_call' || step.tool_id !== GENERATE_DASHBOARD_TOOL_ID) {
      continue;
    }
    for (const result of Array.isArray(step.results) ? step.results : []) {
      if (
        isRecord(result) &&
        isRecord(result.data) &&
        typeof result.data.attachment_id === 'string'
      ) {
        return result.data.attachment_id;
      }
    }
  }
  return undefined;
};

interface DashboardPanel {
  id?: string;
  type?: string;
  config?: unknown;
}

/** Every custom content panel of a dashboard version, including those inside sections. */
const readCustomContentPanels = (dashboardData: unknown): DashboardPanel[] => {
  if (!isRecord(dashboardData) || !Array.isArray(dashboardData.panels)) {
    return [];
  }
  const widgets: unknown[] = dashboardData.panels.flatMap((widget: unknown) =>
    isRecord(widget) && Array.isArray(widget.panels) ? widget.panels : [widget]
  );
  return widgets.filter(
    (widget): widget is DashboardPanel =>
      isRecord(widget) && widget.type === CUSTOM_CONTENT_PANEL_TYPE
  );
};

const toStoredFromPanel = (panel: DashboardPanel | undefined): StoredCustomContent | undefined => {
  if (!panel) {
    return undefined;
  }
  const config = isRecord(panel.config) ? panel.config : {};
  const stored: StoredCustomContent = {};
  const [esql] = Array.isArray(config.esql_query) ? config.esql_query : [];
  if (typeof esql === 'string' && esql.trim().length > 0) {
    stored.esql = esql;
  }
  if (typeof config.template === 'string') {
    stored.template = config.template;
  }
  return stored;
};

/**
 * The custom content panel of a dashboard attachment: the latest version of the panel the agent
 * wrote last, and that same panel (matched by id) in the first version that has it. A dashboard
 * carries no per-panel height, so `height` stays unset.
 */
export const readStoredCustomContentFromDashboard = (
  conversation: Conversation,
  attachmentId: string
): { before?: StoredCustomContent; after?: StoredCustomContent; versionCount: number } => {
  const attachment = conversation.attachments?.find(
    ({ id, type }) => id === attachmentId && type === DASHBOARD_ATTACHMENT_TYPE
  );
  if (!attachment) {
    return { versionCount: 0 };
  }

  const latestPanels = readCustomContentPanels(getLatestVersion(attachment)?.data);
  const latest = latestPanels[latestPanels.length - 1];
  const first = attachment.versions
    .map(({ data }) => readCustomContentPanels(data).find(({ id }) => id === latest?.id))
    .find((panel) => panel !== undefined);

  return {
    before: toStoredFromPanel(first),
    after: toStoredFromPanel(latest),
    versionCount: attachment.versions.length,
  };
};

/** Renderers of the non-custom-content visualizations the agent created in these steps. */
export const getOtherRenderers = (steps: Array<Record<string, unknown>> | undefined): string[] => [
  ...new Set(
    extractVisualizations({ steps })
      .map(({ renderer }) => renderer ?? 'lens')
      .filter((renderer) => renderer !== 'custom_content')
  ),
];

/** Why a run has no custom content panel, naming what the agent did instead. */
export const describeMissingPanel = (output: CustomContentTaskOutput): string => {
  const instead =
    output.otherRenderers.length > 0 ? ` It created: ${output.otherRenderers.join(', ')}.` : '';
  const tools = output.toolIds.length > 0 ? ` Tools: ${output.toolIds.join(', ')}.` : '';
  return `The agent did not store a custom content panel.${instead}${tools}`;
};

/** Error messages from the agent's tool calls, shortened, for diagnosing a bypassed or failed path. */
export const getToolErrors = (steps: Array<Record<string, unknown>> | undefined): string[] =>
  (steps ?? []).flatMap((step) => {
    if (step.type !== 'tool_call' || !Array.isArray(step.results)) {
      return [];
    }
    return step.results.flatMap((result: unknown) =>
      isRecord(result) && result.type === 'error' && isRecord(result.data)
        ? [`${String(step.tool_id)}: ${String(result.data.message ?? '').slice(0, 200)}`]
        : []
    );
  });
