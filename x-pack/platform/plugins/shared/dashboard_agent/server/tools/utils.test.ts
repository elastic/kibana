/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import { resolvePanelsFromAttachments, upsertMarkdownPanel } from './manage_dashboard/utils';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createAttachmentManager = (
  attachmentsById: Record<string, VersionedAttachment>
): AttachmentStateManager => {
  return {
    getAttachmentRecord: (id: string) => attachmentsById[id],
  } as unknown as AttachmentStateManager;
};

const toVersionedAttachment = ({
  id,
  type,
  data,
}: {
  id: string;
  type: string;
  data: unknown;
}): VersionedAttachment => ({
  id,
  type,
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: `${id}-hash`,
    },
  ],
});

describe('resolvePanelsFromAttachments', () => {
  it('resolves visualization attachments into lens panels', async () => {
    const attachments = createAttachmentManager({
      'viz-1': toVersionedAttachment({
        id: 'viz-1',
        type: 'visualization',
        data: {
          query: 'Show request count',
          visualization: { type: 'metric', title: 'Request count' },
          chart_type: 'metric',
          esql: 'FROM logs-* | STATS count(*)',
        },
      }),
    });

    const result = await resolvePanelsFromAttachments({
      attachmentIds: ['viz-1'],
      attachments,
      logger: createMockLogger(),
    });

    expect(result.failures).toEqual([]);
    expect(result.panels).toHaveLength(1);
    expect(result.panels[0]).toMatchObject({
      type: 'lens',
      title: 'Request count',
    });
  });

  it('treats unsupported attachment types as panel-resolution failures', async () => {
    const attachments = createAttachmentManager({
      'unsupported-1': toVersionedAttachment({
        id: 'unsupported-1',
        type: 'unsupported_type',
        data: {
          foo: 'bar',
        },
      }),
    });

    const result = await resolvePanelsFromAttachments({
      attachmentIds: ['unsupported-1'],
      attachments,
      logger: createMockLogger(),
    });

    expect(result.panels).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'attachment_panels',
        identifier: 'unsupported-1',
      }),
    ]);
  });

  it('collects per-attachment failures without failing the whole operation', async () => {
    const result = await resolvePanelsFromAttachments({
      attachmentIds: ['missing-id'],
      attachments: createAttachmentManager({}),
      logger: createMockLogger(),
    });

    expect(result.panels).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'attachment_panels',
        identifier: 'missing-id',
      }),
    ]);
  });
});

describe('upsertMarkdownPanel', () => {
  it('adds a markdown panel when one does not exist', () => {
    const existingPanels: AttachmentPanel[] = [
      {
        type: 'lens',
        panelId: 'panel-1',
        visualization: { type: 'Metric' },
      },
    ];

    const result = upsertMarkdownPanel(existingPanels, '# Summary');

    expect(result.changedPanel).toBeDefined();
    expect(result.panels).toHaveLength(2);
    expect(result.panels[0]).toMatchObject({
      type: 'DASHBOARD_MARKDOWN',
      rawConfig: { content: '# Summary' },
    });
  });

  it('updates existing markdown panel content in place', () => {
    const existingPanels: AttachmentPanel[] = [
      {
        type: 'DASHBOARD_MARKDOWN',
        panelId: 'markdown-1',
        rawConfig: { content: '# Old summary' },
      },
      {
        type: 'lens',
        panelId: 'panel-1',
        visualization: { type: 'Metric' },
      },
    ];

    const result = upsertMarkdownPanel(existingPanels, '# New summary');

    expect(result.changedPanel).toMatchObject({
      type: 'DASHBOARD_MARKDOWN',
      panelId: 'markdown-1',
      rawConfig: { content: '# New summary' },
    });
    expect(result.panels[0]).toMatchObject({
      type: 'DASHBOARD_MARKDOWN',
      panelId: 'markdown-1',
      rawConfig: { content: '# New summary' },
    });
    expect(result.panels[1]).toEqual(existingPanels[1]);
  });

  it('does not change panels when markdown content is unchanged', () => {
    const existingPanels: AttachmentPanel[] = [
      {
        type: 'DASHBOARD_MARKDOWN',
        panelId: 'markdown-1',
        rawConfig: { content: '# Summary' },
      },
    ];

    const result = upsertMarkdownPanel(existingPanels, '# Summary');

    expect(result.changedPanel).toBeUndefined();
    expect(result.panels).toEqual(existingPanels);
  });

  it('does not change panels when markdown content is not provided', () => {
    const existingPanels: AttachmentPanel[] = [
      {
        type: 'lens',
        panelId: 'panel-1',
        visualization: { type: 'Metric' },
      },
    ];

    const result = upsertMarkdownPanel(existingPanels);

    expect(result.changedPanel).toBeUndefined();
    expect(result.panels).toEqual(existingPanels);
  });
});
