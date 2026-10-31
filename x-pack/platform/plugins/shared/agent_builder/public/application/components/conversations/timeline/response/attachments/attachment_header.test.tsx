/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useResizeObserver } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentHeader, COMPACT_WIDTH_THRESHOLD } from './attachment_header';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useResizeObserver: jest.fn(() => ({ width: 0, height: 0 })),
  };
});

const mockedUseResizeObserver = useResizeObserver as jest.MockedFunction<typeof useResizeObserver>;

const actionButtons = [
  { label: 'Edit', type: ActionButtonType.PRIMARY, handler: jest.fn() },
  { label: 'Copy', type: ActionButtonType.SECONDARY, handler: jest.fn() },
];

const PREVIEWING_IN_APP_LABEL = "You're previewing this";

describe('AttachmentHeader', () => {
  beforeEach(() => {
    mockedUseResizeObserver.mockReturnValue({ width: 0, height: 0 });
  });

  it('shows the action buttons when not previewing', () => {
    render(<AttachmentHeader title="Test attachment" actionButtons={actionButtons} />);

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByText(PREVIEWING_IN_APP_LABEL)).not.toBeInTheDocument();
  });

  it('shows "Close preview" instead of the action buttons when previewing in canvas', () => {
    const onClosePreview = jest.fn();
    render(
      <AttachmentHeader
        title="Test attachment"
        actionButtons={actionButtons}
        previewBadgeState="previewing_in_canvas"
        onClosePreview={onClosePreview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));

    expect(onClosePreview).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByText(PREVIEWING_IN_APP_LABEL)).not.toBeInTheDocument();
  });

  it('shows "Close preview" when previewing in canvas without action buttons', () => {
    render(<AttachmentHeader title="Test attachment" previewBadgeState="previewing_in_canvas" />);

    expect(screen.getByRole('button', { name: 'Close preview' })).toBeInTheDocument();
  });

  it('shows the in-app preview badge instead of the action buttons, with no close button', () => {
    render(
      <AttachmentHeader
        title="Test attachment"
        actionButtons={actionButtons}
        previewBadgeState="previewing_in_app"
        onClosePreview={jest.fn()}
      />
    );

    expect(screen.getByText(PREVIEWING_IN_APP_LABEL)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close preview' })).not.toBeInTheDocument();
  });

  it('shows the in-app preview badge without action buttons', () => {
    render(<AttachmentHeader title="Test attachment" previewBadgeState="previewing_in_app" />);

    expect(screen.getByText(PREVIEWING_IN_APP_LABEL)).toBeInTheDocument();
  });

  it('shows an eye icon with a tooltip for the in-app preview in compact mode', async () => {
    mockedUseResizeObserver.mockReturnValue({ width: COMPACT_WIDTH_THRESHOLD, height: 72 });
    render(
      <AttachmentHeader
        title="Test attachment"
        actionButtons={actionButtons}
        previewBadgeState="previewing_in_app"
      />
    );

    const indicator = screen.getByTestId('agentBuilderAttachmentPreviewingInAppIcon');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: PREVIEWING_IN_APP_LABEL })).not.toBeInTheDocument();

    act(() => indicator.focus());

    expect(await screen.findByRole('tooltip')).toHaveTextContent(PREVIEWING_IN_APP_LABEL);
  });
});
