/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { noop } from 'lodash/fp';

import {
  onlyCreateCommentPermissions,
  noCreateCommentCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';

import { AttachmentType } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER, MAX_COMMENT_LENGTH } from '../../../common/constants';
import { createAttachments } from '../../containers/api';
import type { AddCommentProps, AddCommentRefObject } from '.';
import { AddComment } from '.';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';
import type { CaseAttachmentWithoutOwner } from '../../types';

import { useCreateAttachments } from '../../containers/use_create_attachments';

jest.mock('../../containers/use_create_attachments');

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const createAttachmentsMock = jest.fn().mockImplementation(() => defaultResponse);
const onCommentSaving = jest.fn();
const onCommentPosted = jest.fn();

const addCommentProps: AddCommentProps = {
  id: 'newComment',
  caseId: '1234',
  onCommentSaving,
  onCommentPosted,
  showLoading: false,
  statusActionButton: null,
};

const defaultResponse = {
  isLoading: false,
  isError: false,
  mutate: createAttachments,
};

const sampleData: CaseAttachmentWithoutOwner = {
  comment: 'what a cool comment',
  type: AttachmentType.user as const,
};
const appId = 'securitySolution';
const draftKey = `cases.${appId}.${addCommentProps.caseId}.${addCommentProps.id}.markdownEditor`;

describe('AddComment ', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useCreateAttachmentsMock.mockReturnValue({
      isLoading: false,
      mutate: createAttachmentsMock,
    });
  });

  afterEach(() => {
    sessionStorage.removeItem(draftKey);
  });

  it('renders correctly', () => {
    renderWithTestingProviders(<AddComment {...addCommentProps} />);

    expect(screen.getByTestId('add-comment')).toBeInTheDocument();
  });

  it('should render spinner and disable submit when loading', async () => {
    useCreateAttachmentsMock.mockReturnValue({
      isLoading: true,
      mutateAsync: createAttachmentsMock,
    });

    renderWithTestingProviders(<AddComment {...{ ...addCommentProps, showLoading: true }} />);

    fireEvent.change(screen.getByLabelText('caseComment'), {
      target: { value: sampleData.comment },
    });

    fireEvent.click(screen.getByTestId('submit-comment'));

    expect(await screen.findByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
  });

  it('should hide the component when the user does not have createComment permissions', () => {
    createAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));

    renderWithTestingProviders(<AddComment {...{ ...addCommentProps }} />, {
      wrapperProps: { permissions: noCreateCommentCasesPermissions() },
    });

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-comment-form-wrapper')).not.toBeInTheDocument();
  });

  it('should show the component when the user does not have create permissions, but has createComment permissions', () => {
    createAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));

    renderWithTestingProviders(<AddComment {...{ ...addCommentProps }} />, {
      wrapperProps: { permissions: onlyCreateCommentPermissions() },
    });

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-comment-form-wrapper')).toBeInTheDocument();
  });

  it('should post comment on submit click', async () => {
    renderWithTestingProviders(<AddComment {...addCommentProps} />);

    const markdown = screen.getByTestId('euiMarkdownEditorTextArea');
    await userEvent.type(markdown, sampleData.comment);

    await userEvent.click(screen.getByTestId('submit-comment'));

    await waitFor(() => expect(onCommentSaving).toBeCalled());
    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith(
        {
          caseId: addCommentProps.caseId,
          attachments: [
            {
              comment: sampleData.comment,
              type: AttachmentType.user,
            },
          ],
          caseOwner: SECURITY_SOLUTION_OWNER,
        },
        { onSuccess: expect.any(Function) }
      )
    );
    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveTextContent('');
    });
  });

  it('should insert a quote', async () => {
    const sampleQuote = 'what a cool quote \n with new lines';
    const ref = React.createRef<AddCommentRefObject>();

    renderWithTestingProviders(<AddComment {...addCommentProps} ref={ref} />);

    await userEvent.click(await screen.findByTestId('euiMarkdownEditorTextArea'));
    await userEvent.paste(sampleData.comment);

    await act(async () => {
      ref.current!.addQuote(sampleQuote);
    });

    expect((await screen.findByTestId('euiMarkdownEditorTextArea')).textContent).toContain(
      `${sampleData.comment}\n\n> what a cool quote \n>  with new lines \n\n`
    );
  });

  it('it should insert a timeline', async () => {
    const useInsertTimelineMock = jest.fn();
    let attachTimeline = noop;
    useInsertTimelineMock.mockImplementation((comment, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });

    const mockTimelineIntegration = { ...timelineIntegrationMock };
    mockTimelineIntegration.hooks.useInsertTimeline = useInsertTimelineMock;

    renderWithTestingProviders(
      <CasesTimelineIntegrationProvider timelineIntegration={mockTimelineIntegration}>
        <AddComment {...addCommentProps} />
      </CasesTimelineIntegrationProvider>
    );

    await act(async () => {
      attachTimeline('[title](url)');
    });

    expect(await screen.findByTestId('euiMarkdownEditorTextArea')).toHaveTextContent(
      '[title](url)'
    );
  });

  describe('errors', () => {
    it('shows an error when comment is empty', async () => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      await userEvent.type(markdown, 'test');
      await userEvent.clear(markdown);

      expect(await screen.findByText('Empty comments are not allowed.')).toBeInTheDocument();
      expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
    });

    it('shows an error when comment is of empty characters', async () => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      await userEvent.clear(markdown);
      await userEvent.type(markdown, '  ');

      expect(await screen.findByText('Empty comments are not allowed.')).toBeInTheDocument();
      expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
    });

    it('shows an error when comment is too long', async () => {
      const longComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);

      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      await userEvent.click(markdown);
      await userEvent.paste(longComment);

      expect(
        await screen.findByText(
          'The length of the comment is too long. The maximum length is 30000 characters.'
        )
      ).toBeInTheDocument();

      expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
    });
  });
});

describe('draft comment ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should clear session storage on submit', async () => {
    renderWithTestingProviders(<AddComment {...addCommentProps} />);

    fireEvent.change(screen.getByLabelText('caseComment'), {
      target: { value: sampleData.comment },
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('caseComment')).toHaveValue(sessionStorage.getItem(draftKey));
    });

    fireEvent.click(screen.getByTestId('submit-comment'));

    await waitFor(() => {
      expect(onCommentSaving).toBeCalled();
    });

    expect(createAttachmentsMock).toBeCalledWith(
      {
        caseId: addCommentProps.caseId,
        attachments: [
          {
            comment: sampleData.comment,
            type: AttachmentType.user,
          },
        ],
        caseOwner: SECURITY_SOLUTION_OWNER,
      },
      { onSuccess: expect.any(Function) }
    );

    await waitFor(() => {
      expect(sessionStorage.getItem(draftKey)).toBe('');
    });

    expect(screen.getByLabelText('caseComment').textContent).toBe('');
  });

  describe('existing storage key', () => {
    beforeEach(() => {
      sessionStorage.setItem(draftKey, 'value set in storage');
    });

    afterEach(() => {
      sessionStorage.removeItem(draftKey);
    });

    it('should have draft comment same as existing session storage', async () => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      expect(screen.getByLabelText('caseComment')).toHaveValue('value set in storage');
    });
  });
});
