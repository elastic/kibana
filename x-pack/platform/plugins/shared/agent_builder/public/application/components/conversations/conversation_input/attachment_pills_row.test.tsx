/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  ConversationAttachment,
  AttachmentGroup,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentPillsRow } from './attachment_pills_row';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { AttachmentGroupPill } from './attachment_group_pill';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('./attachment_pill', () => ({
  AttachmentPill: ({
    attachment,
    isLoading,
    isHighlighted,
    onRemoveAttachment,
  }: {
    attachment: { id: string; type: string; data?: unknown; description?: string };
    isLoading?: boolean;
    isHighlighted?: boolean;
    onRemoveAttachment?: () => void;
  }) => (
    <button
      type="button"
      data-test-subj={`mock-attachment-pill-${attachment.id}`}
      data-loading={isLoading ? 'true' : undefined}
      data-highlighted={isHighlighted ? 'true' : undefined}
      data-description={attachment.description}
      data-type={attachment.type}
      data-name={(attachment.data as { name?: string } | undefined)?.name}
      onClick={onRemoveAttachment}
    />
  ),
}));

jest.mock('./attachment_group_pill', () => ({
  AttachmentGroupPill: jest.fn(() => null),
}));

const mockUseConversationContext = jest.mocked(useConversationContext);
const MockAttachmentGroupPill = jest.mocked(AttachmentGroupPill);

const makeGroup = (id: string): AttachmentGroup => ({
  type: 'group',
  id,
  label: '2 Alerts',
  items: [],
});

const makeInput = (id: string): ConversationAttachment => ({
  id,
  type: 'text',
  data: {},
});

describe('AttachmentPillsRow', () => {
  const mockRemoveAttachment = jest.fn();

  beforeEach(() => {
    mockRemoveAttachment.mockReset();
    MockAttachmentGroupPill.mockReset();
    MockAttachmentGroupPill.mockReturnValue(null);
    mockUseConversationContext.mockReturnValue({
      removeAttachment: mockRemoveAttachment,
      isEmbeddedContext: false,
      conversationActions: {} as never,
    });
  });

  it('renders nothing when the attachments list is empty', () => {
    const { container } = render(<AttachmentPillsRow attachments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders AttachmentGroupPill for an AttachmentGroup', () => {
    render(<AttachmentPillsRow attachments={[makeGroup('g1')]} />);
    expect(MockAttachmentGroupPill).toHaveBeenCalledTimes(1);
    expect(MockAttachmentGroupPill.mock.calls[0][0].group.id).toBe('g1');
  });

  it('renders AttachmentPill for an AttachmentInput (no group pill)', () => {
    render(<AttachmentPillsRow attachments={[makeInput('a1')]} />);
    expect(MockAttachmentGroupPill).not.toHaveBeenCalled();
    expect(screen.getByTestId('mock-attachment-pill-a1')).toBeInTheDocument();
  });

  it('dispatches group pill for groups and regular pill for individuals in a mixed list', () => {
    render(
      <AttachmentPillsRow attachments={[makeInput('a1'), makeGroup('g1'), makeInput('a2')]} />
    );
    expect(screen.getByTestId('mock-attachment-pill-a1')).toBeInTheDocument();
    expect(screen.getByTestId('mock-attachment-pill-a2')).toBeInTheDocument();
    expect(MockAttachmentGroupPill).toHaveBeenCalledTimes(1);
    expect(MockAttachmentGroupPill.mock.calls[0][0].group.id).toBe('g1');
  });

  it('passes an onRemove callback to AttachmentGroupPill when removable is true', () => {
    render(<AttachmentPillsRow attachments={[makeGroup('g1')]} removable />);
    const { onRemove } = MockAttachmentGroupPill.mock.calls[0][0];
    expect(onRemove).toBeDefined();
    if (onRemove) onRemove();
    expect(mockRemoveAttachment).toHaveBeenCalledWith(0);
  });

  it('does not pass an onRemove callback to AttachmentGroupPill when removable is false', () => {
    render(<AttachmentPillsRow attachments={[makeGroup('g1')]} removable={false} />);
    const { onRemove } = MockAttachmentGroupPill.mock.calls[0][0];
    expect(onRemove).toBeUndefined();
  });

  describe('loading files', () => {
    it('renders nothing for an empty list with no loading files', () => {
      const { container } = render(<AttachmentPillsRow attachments={[]} loadingFiles={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders a named loading pill for each loading file, even with no attachments', () => {
      render(
        <AttachmentPillsRow
          attachments={[]}
          loadingFiles={[{ name: 'invoice.pdf', kind: 'binary' }]}
        />
      );

      const pill = screen.getByTestId('mock-attachment-pill-invoice.pdf');
      expect(pill).toHaveAttribute('data-loading', 'true');
      expect(pill).toHaveAttribute('data-description', 'invoice.pdf');
    });

    it('renders the loading pills after the attachments', () => {
      render(
        <AttachmentPillsRow
          attachments={[makeInput('a1')]}
          loadingFiles={[{ name: 'invoice.pdf', kind: 'binary' }]}
        />
      );

      const pills = screen.getAllByTestId(/mock-attachment-pill-/);
      expect(pills.map((pill) => pill.getAttribute('data-test-subj'))).toEqual([
        'mock-attachment-pill-a1',
        'mock-attachment-pill-invoice.pdf',
      ]);
    });

    it('renders a loading text file as a text attachment with its name', () => {
      render(
        <AttachmentPillsRow attachments={[]} loadingFiles={[{ name: 'notes.md', kind: 'text' }]} />
      );

      const pill = screen.getByTestId('mock-attachment-pill-notes.md');
      expect(pill).toHaveAttribute('data-type', 'text');
      expect(pill).toHaveAttribute('data-name', 'notes.md');
      expect(pill).toHaveAttribute('data-loading', 'true');
    });

    it('renders a loading PDF as a binary attachment', () => {
      render(
        <AttachmentPillsRow attachments={[]} loadingFiles={[{ name: 'a.pdf', kind: 'binary' }]} />
      );

      expect(screen.getByTestId('mock-attachment-pill-a.pdf')).toHaveAttribute(
        'data-type',
        'binary'
      );
    });

    it('cancels a loading file by its name when removable', () => {
      const onRemoveLoadingFile = jest.fn();
      render(
        <AttachmentPillsRow
          attachments={[]}
          loadingFiles={[{ name: 'invoice.pdf', kind: 'binary' }]}
          onRemoveLoadingFile={onRemoveLoadingFile}
          removable
        />
      );

      screen.getByTestId('mock-attachment-pill-invoice.pdf').click();

      expect(onRemoveLoadingFile).toHaveBeenCalledWith('invoice.pdf');
    });

    it('offers no cancel when not removable', () => {
      const onRemoveLoadingFile = jest.fn();
      render(
        <AttachmentPillsRow
          attachments={[]}
          loadingFiles={[{ name: 'invoice.pdf', kind: 'binary' }]}
          onRemoveLoadingFile={onRemoveLoadingFile}
        />
      );

      screen.getByTestId('mock-attachment-pill-invoice.pdf').click();

      expect(onRemoveLoadingFile).not.toHaveBeenCalled();
    });

    it('passes the description of an added document to its pill, so the label is its name', () => {
      render(
        <AttachmentPillsRow
          attachments={[
            { id: 'pdf-1', type: 'binary', origin: 'file-1', description: 'invoice.pdf' },
          ]}
        />
      );

      expect(screen.getByTestId('mock-attachment-pill-pdf-1')).toHaveAttribute(
        'data-description',
        'invoice.pdf'
      );
    });
  });

  describe('highlighting by the hovered chip name', () => {
    const makeBinary = (id: string, name: string): ConversationAttachment => ({
      id,
      type: 'binary',
      data: {},
      description: name,
    });

    it('highlights the document pill whose name matches the hovered chip', () => {
      render(
        <AttachmentPillsRow
          attachments={[makeBinary('d1', 'notes.md'), makeBinary('d2', 'other.md')]}
          hoveredAttachmentName="notes.md"
        />
      );

      expect(screen.getByTestId('mock-attachment-pill-d1')).toHaveAttribute(
        'data-highlighted',
        'true'
      );
      expect(screen.getByTestId('mock-attachment-pill-d2')).not.toHaveAttribute('data-highlighted');
    });

    it('highlights the loading file pill whose name matches the hovered chip', () => {
      render(
        <AttachmentPillsRow
          attachments={[]}
          loadingFiles={[{ name: 'notes.md', kind: 'binary' }]}
          hoveredAttachmentName="notes.md"
        />
      );

      expect(screen.getByTestId('mock-attachment-pill-notes.md')).toHaveAttribute(
        'data-highlighted',
        'true'
      );
    });
  });
});
