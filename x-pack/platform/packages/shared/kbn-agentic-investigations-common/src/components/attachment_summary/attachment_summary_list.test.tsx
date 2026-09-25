/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { AttachmentSummaryList } from './attachment_summary_list';
import type { SummaryAttachment } from './select_summary_attachments';

const makeAttachment = (id: string): SummaryAttachment => ({
  typeName: 'Alert',
  attachment: {
    id,
    type: 'security.alert',
    versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: id }],
    current_version: 1,
  },
});

const makeAttachments = (count: number) =>
  Array.from({ length: count }, (_, index) => makeAttachment(`attachment-${index}`));

const attachmentsService = {
  getAttachmentUiDefinition: () => ({
    getLabel: (attachment: { id: string }) => `Label for ${attachment.id}`,
    getIcon: () => 'bell',
  }),
} as unknown as AttachmentServiceStartContract;

const renderList = (attachments: SummaryAttachment[], collapsedCount?: number) =>
  render(
    <AttachmentSummaryList
      attachments={attachments}
      attachmentsService={attachmentsService}
      collapsedCount={collapsedCount}
    />
  );

describe('AttachmentSummaryList', () => {
  it('renders nothing when there are no attachments', () => {
    const { container } = renderList([]);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([[3], [5]])('shows every row and no toggle for %i attachments', (count) => {
    renderList(makeAttachments(count));

    expect(screen.getAllByRole('listitem')).toHaveLength(count);
    expect(screen.queryByTestId('attachmentSummaryToggle')).not.toBeInTheDocument();
  });

  it('collapses to five rows and counts the rest', () => {
    renderList(makeAttachments(10));

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByTestId('attachmentSummaryToggle')).toHaveTextContent('+ Show more (5)');
  });

  it('expands and collapses again', async () => {
    renderList(makeAttachments(10));
    const toggle = screen.getByTestId('attachmentSummaryToggle');

    await userEvent.click(toggle);

    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    // Collapsing has no affordance of its own, so no '+' comes back on the way out.
    expect(toggle).toHaveTextContent('Show less');
    expect(toggle).not.toHaveTextContent('+');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(toggle).toHaveTextContent('+ Show more (5)');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('honours a non-default collapsed count', () => {
    renderList(makeAttachments(6), 2);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('attachmentSummaryToggle')).toHaveTextContent('+ Show more (4)');
  });

  it('points the toggle at the list it expands', () => {
    renderList(makeAttachments(10));

    const controlledId = screen
      .getByTestId('attachmentSummaryToggle')
      .getAttribute('aria-controls');

    expect(screen.getByRole('list')).toHaveAttribute('id', controlledId);
  });

  it('leaves the rows out of the tab order when their type has no drill-down', () => {
    renderList(makeAttachments(3));

    // No toggle at three rows, so nothing in the section should be interactive at all.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('gives each row a single tab stop once the type registers a drill-down', () => {
    render(
      <AttachmentSummaryList
        attachments={makeAttachments(3)}
        attachmentsService={
          {
            getAttachmentUiDefinition: () => ({
              getLabel: (attachment: { id: string }) => `Label for ${attachment.id}`,
              getIcon: () => 'bell',
              renderConversationDetailsContent: () => null,
            }),
          } as unknown as AttachmentServiceStartContract
        }
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(3);
    // The button nests inside the row rather than replacing it, so list semantics survive.
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  describe('drill-down', () => {
    const renderConversationDetailsContent = jest.fn(() => <div data-test-subj="drilldown" />);

    const drilldownService = {
      getAttachmentUiDefinition: () => ({
        getLabel: (attachment: { id: string }) => `Label for ${attachment.id}`,
        getIcon: () => 'bell',
        renderConversationDetailsContent,
      }),
    } as unknown as AttachmentServiceStartContract;

    const renderDrilldownList = (count: number) =>
      render(
        <AttachmentSummaryList
          attachments={makeAttachments(count)}
          attachmentsService={drilldownService}
        />
      );

    beforeEach(() => renderConversationDetailsContent.mockClear());

    it('mounts nothing until a row is clicked', () => {
      renderDrilldownList(3);

      expect(screen.queryByTestId('drilldown')).not.toBeInTheDocument();
      expect(renderConversationDetailsContent).not.toHaveBeenCalled();
    });

    it('mounts the drill-down for the clicked row', async () => {
      renderDrilldownList(3);

      await userEvent.click(screen.getAllByRole('button')[0]);

      expect(screen.getByTestId('drilldown')).toBeInTheDocument();
      expect(renderConversationDetailsContent).toHaveBeenCalledWith(
        expect.objectContaining({ attachment: expect.objectContaining({ id: 'attachment-0' }) })
      );
    });

    it('keeps one mounted when several rows are clicked, since each carries a provider stack', async () => {
      renderDrilldownList(3);

      await userEvent.click(screen.getAllByRole('button')[0]);
      await userEvent.click(screen.getAllByRole('button')[1]);

      expect(screen.getAllByTestId('drilldown')).toHaveLength(1);
      expect(renderConversationDetailsContent).toHaveBeenLastCalledWith(
        expect.objectContaining({ attachment: expect.objectContaining({ id: 'attachment-1' }) })
      );
    });

    it('contains a failing drill-down instead of taking the summary down with it', async () => {
      // It belongs to whichever plugin owns the attachment type and renders in our own fiber.
      const Throw = () => {
        throw new Error('chunk failed to load');
      };
      const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
      try {
        render(
          <AttachmentSummaryList
            attachments={makeAttachments(2)}
            attachmentsService={
              {
                getAttachmentUiDefinition: () => ({
                  getLabel: (attachment: { id: string }) => `Label for ${attachment.id}`,
                  renderConversationDetailsContent: () => <Throw />,
                }),
              } as unknown as AttachmentServiceStartContract
            }
          />
        );

        await userEvent.click(screen.getAllByRole('button')[0]);

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(warn).toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('remounts on a second click of the same row, so the flyout reopens', async () => {
      // The drill-down acts on mount, so a re-render of the same element would reopen nothing.
      const onMount = jest.fn();
      const CountMounts = () => {
        React.useEffect(() => onMount(), []);
        return null;
      };
      render(
        <AttachmentSummaryList
          attachments={makeAttachments(1)}
          attachmentsService={
            {
              getAttachmentUiDefinition: () => ({
                getLabel: () => 'Label',
                renderConversationDetailsContent: () => <CountMounts />,
              }),
            } as unknown as AttachmentServiceStartContract
          }
        />
      );

      await userEvent.click(screen.getByRole('button'));
      expect(onMount).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole('button'));
      expect(onMount).toHaveBeenCalledTimes(2);
    });
  });
});
