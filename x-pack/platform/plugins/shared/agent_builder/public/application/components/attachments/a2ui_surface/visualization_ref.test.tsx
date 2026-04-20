/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { A2UIComponent } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { VisualizationRefRenderer } from './visualization_ref';

const mockLensComponent = jest.fn((_props: Record<string, unknown>) => (
  <div data-testid="visualize-lens">Lens Chart</div>
));

jest.mock('../../tools/esql/visualize_lens', () => ({
  VisualizeLens: (props: Record<string, unknown>) => mockLensComponent(props),
}));

const mockStartDependencies = {
  lens: { stateHelperApi: jest.fn() },
  dataViews: {},
  uiActions: {},
};

const mockConversation = {
  attachments: [] as VersionedAttachment[],
};

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ startDependencies: mockStartDependencies }),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: () => ({ conversation: mockConversation }),
}));

const createVisualizationAttachment = (
  id: string,
  vizData: Record<string, unknown> = { layers: [] }
): VersionedAttachment => ({
  id,
  type: AttachmentType.visualization,
  versions: [
    {
      version: 1,
      data: {
        query: 'Show revenue over time',
        visualization: vizData,
        chart_type: 'xy',
        esql: 'FROM index | STATS count()',
      },
      content_hash: 'abc123',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  current_version: 1,
});

const createComponent = (overrides: Partial<A2UIComponent> = {}): A2UIComponent => ({
  id: 'viz-ref',
  component: 'VisualizationRef',
  attachment_id: 'viz-123',
  ...overrides,
});

describe('VisualizationRefRenderer', () => {
  beforeEach(() => {
    mockConversation.attachments = [];
    mockLensComponent.mockClear();
  });

  it('renders VisualizeLens when the referenced attachment exists', async () => {
    const vizAttachment = createVisualizationAttachment('viz-123', { layers: [{ type: 'xy' }] });
    mockConversation.attachments = [vizAttachment];

    render(<VisualizationRefRenderer component={createComponent()} />);

    await waitFor(() => {
      expect(mockLensComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          lensConfig: { layers: [{ type: 'xy' }] },
          dataViews: mockStartDependencies.dataViews,
          lens: mockStartDependencies.lens,
          uiActions: mockStartDependencies.uiActions,
        })
      );
    });
  });

  it('renders placeholder when the attachment is not found', () => {
    mockConversation.attachments = [];

    render(<VisualizationRefRenderer component={createComponent()} />);

    expect(screen.getByText(/Visualization:/)).toBeInTheDocument();
    expect(screen.getByText(/viz-123/)).toBeInTheDocument();
    expect(mockLensComponent).not.toHaveBeenCalled();
  });

  it('renders placeholder when attachment_id is missing', () => {
    render(<VisualizationRefRenderer component={createComponent({ attachment_id: undefined })} />);

    expect(screen.getByText(/unknown/)).toBeInTheDocument();
    expect(mockLensComponent).not.toHaveBeenCalled();
  });

  it('resolves specific version when provided', async () => {
    const attachment: VersionedAttachment = {
      id: 'viz-123',
      type: AttachmentType.visualization,
      versions: [
        {
          version: 1,
          data: {
            query: 'v1',
            visualization: { v: 1 },
            chart_type: 'xy',
            esql: 'FROM a',
          },
          content_hash: 'v1hash',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          version: 2,
          data: {
            query: 'v2',
            visualization: { v: 2 },
            chart_type: 'xy',
            esql: 'FROM b',
          },
          content_hash: 'v2hash',
          created_at: '2026-01-01T00:00:01Z',
        },
      ],
      current_version: 2,
    };
    mockConversation.attachments = [attachment];

    render(<VisualizationRefRenderer component={createComponent({ version: 1 })} />);

    await waitFor(() => {
      expect(mockLensComponent).toHaveBeenCalledWith(
        expect.objectContaining({ lensConfig: { v: 1 } })
      );
    });
  });

  it('uses latest version when no version is specified', async () => {
    const attachment: VersionedAttachment = {
      id: 'viz-123',
      type: AttachmentType.visualization,
      versions: [
        {
          version: 1,
          data: {
            query: 'v1',
            visualization: { v: 1 },
            chart_type: 'xy',
            esql: 'FROM a',
          },
          content_hash: 'v1hash',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          version: 2,
          data: {
            query: 'v2',
            visualization: { v: 2 },
            chart_type: 'xy',
            esql: 'FROM b',
          },
          content_hash: 'v2hash',
          created_at: '2026-01-01T00:00:01Z',
        },
      ],
      current_version: 2,
    };
    mockConversation.attachments = [attachment];

    render(<VisualizationRefRenderer component={createComponent()} />);

    await waitFor(() => {
      expect(mockLensComponent).toHaveBeenCalledWith(
        expect.objectContaining({ lensConfig: { v: 2 } })
      );
    });
  });

  it('passes time_range from visualization data', async () => {
    const vizAttachment: VersionedAttachment = {
      id: 'viz-123',
      type: AttachmentType.visualization,
      versions: [
        {
          version: 1,
          data: {
            query: 'Revenue over time',
            visualization: { layers: [] },
            chart_type: 'xy',
            esql: 'FROM index',
            time_range: { from: 'now-24h', to: 'now' },
          },
          content_hash: 'hash',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      current_version: 1,
    };
    mockConversation.attachments = [vizAttachment];

    render(<VisualizationRefRenderer component={createComponent()} />);

    await waitFor(() => {
      expect(mockLensComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: { from: 'now-24h', to: 'now' },
        })
      );
    });
  });

  it('ignores non-visualization attachments with the same id', () => {
    const textAttachment: VersionedAttachment = {
      id: 'viz-123',
      type: AttachmentType.text,
      versions: [
        { version: 1, data: { content: 'hello' }, content_hash: 'hash', created_at: '2026-01-01T00:00:00Z' },
      ],
      current_version: 1,
    };
    mockConversation.attachments = [textAttachment];

    render(<VisualizationRefRenderer component={createComponent()} />);

    expect(screen.getByText(/Visualization:/)).toBeInTheDocument();
    expect(mockLensComponent).not.toHaveBeenCalled();
  });
});
