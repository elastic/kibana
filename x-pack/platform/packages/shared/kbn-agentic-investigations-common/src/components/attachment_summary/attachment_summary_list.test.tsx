/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentSummaryList } from './attachment_summary_list';

const makeAttachment = (id: string, type = 'security.alert'): VersionedAttachment => ({
  id,
  type,
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: id }],
  current_version: 1,
});

const makeSectionRenderer =
  (sectionTestId: string) =>
  ({ attachment }: { attachment: { id: string } }) =>
    <div data-test-subj={sectionTestId} data-attachment-id={attachment.id} />;

const makeService = (
  renderConversationDetailsContent?: (props: { attachment: { id: string } }) => React.ReactNode
) =>
  ({
    getAttachmentUiDefinition: () =>
      renderConversationDetailsContent ? { renderConversationDetailsContent } : {},
  } as unknown as AttachmentServiceStartContract);

describe('AttachmentSummaryList', () => {
  it('renders nothing when there are no attachments', () => {
    const { container } = render(
      <AttachmentSummaryList attachments={[]} attachmentsService={makeService()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one section per attachment', () => {
    render(
      <AttachmentSummaryList
        attachments={[makeAttachment('a1'), makeAttachment('a2'), makeAttachment('a3')]}
        attachmentsService={makeService(makeSectionRenderer('section'))}
      />
    );

    expect(screen.getAllByTestId('section')).toHaveLength(3);
  });

  it('skips attachments whose definition has no renderer', () => {
    const service = {
      getAttachmentUiDefinition: (type: string) => {
        if (type === 'security.alert') {
          return { renderConversationDetailsContent: makeSectionRenderer('section') };
        }
        return {};
      },
    } as unknown as AttachmentServiceStartContract;

    render(
      <AttachmentSummaryList
        attachments={[makeAttachment('a1'), makeAttachment('a2', 'security.rule')]}
        attachmentsService={service}
      />
    );

    expect(screen.getAllByTestId('section')).toHaveLength(1);
  });

  it('renders nothing when no attachments have a renderer', () => {
    const { container } = render(
      <AttachmentSummaryList
        attachments={[makeAttachment('a1'), makeAttachment('a2')]}
        attachmentsService={makeService()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('one throwing renderer does not break the others', () => {
    const Throw = () => {
      throw new Error('chunk failed to load');
    };
    const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
    try {
      const service = {
        getAttachmentUiDefinition: (type: string) => {
          if (type === 'security.alert') {
            return { renderConversationDetailsContent: () => <Throw /> };
          }
          return { renderConversationDetailsContent: makeSectionRenderer('surviving') };
        },
      } as unknown as AttachmentServiceStartContract;

      render(
        <AttachmentSummaryList
          attachments={[makeAttachment('a1'), makeAttachment('a2', 'security.rule')]}
          attachmentsService={service}
        />
      );

      expect(screen.getByTestId('surviving')).toBeInTheDocument();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('passes the current-version attachment data to the renderer', () => {
    const renderer = jest.fn(() => <div />);

    render(
      <AttachmentSummaryList
        attachments={[makeAttachment('attach-0')]}
        attachmentsService={makeService(renderer)}
      />
    );

    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({ attachment: expect.objectContaining({ id: 'attach-0' }) })
    );
  });
});
