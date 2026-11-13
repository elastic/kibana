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

import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { SECURITY_SOLUTION_OWNER, MAX_COMMENT_LENGTH } from '../../../common/constants';
import { createAttachments, deleteFileAttachments } from '../../containers/api';
import type { AddCommentProps, AddCommentRefObject } from '.';
import { AddComment } from '.';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';

import { useCreateAttachments } from '../../containers/use_create_attachments';
import { KibanaServices } from '../../common/lib/kibana';
import { useFileTray } from '../markdown_editor/file_tray';
import type { TrayFile, UseFileTrayReturn } from '../markdown_editor/file_tray';

jest.mock('../../containers/use_create_attachments');
jest.mock('../../containers/api', () => ({
  ...jest.requireActual('../../containers/api'),
  deleteFileAttachments: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../markdown_editor/file_tray', () => ({
  ...jest.requireActual('../markdown_editor/file_tray'),
  useFileTray: jest.fn(),
}));

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const useFileTrayMock = useFileTray as jest.Mock;
const deleteFileAttachmentsMock = deleteFileAttachments as jest.Mock;

const addFilesMock = jest.fn();
const resetFileTrayMock = jest.fn();
const mockFileTray = (overrides: Partial<UseFileTrayReturn> = {}) =>
  useFileTrayMock.mockReturnValue({
    isEnabled: true,
    trayFile: null,
    trayError: null,
    addFiles: addFilesMock,
    removeFile: jest.fn(),
    reset: resetFileTrayMock,
    ...overrides,
  });

const pdf = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });
const uploadedTrayFile: TrayFile = {
  file: pdf,
  status: 'uploaded',
  id: 'file-1',
  fileJSON: {
    id: 'file-1',
    name: 'report',
    extension: 'pdf',
    mimeType: 'application/pdf',
    size: 4,
    created: '2026-11-09T10:00:00.000Z',
    updated: '2026-11-09T10:00:00.000Z',
    fileKind: 'securitySolution',
    status: 'READY',
    alt: undefined,
    meta: {},
    user: undefined,
  },
};

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

const sampleData = { comment: 'what a cool comment' };
const appId = 'securitySolution';
const draftKey = `cases.${appId}.${addCommentProps.caseId}.${addCommentProps.id}.markdownEditor`;

const getConfigMock = jest.spyOn(KibanaServices, 'getConfig');
const getCasesConfig = (attachmentsEnabled: boolean): ReturnType<typeof KibanaServices.getConfig> =>
  ({ attachments: { enabled: attachmentsEnabled } } as ReturnType<typeof KibanaServices.getConfig>);

describe('AddComment ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileTray();
    getConfigMock.mockReturnValue(getCasesConfig(false));

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

    await waitFor(() => expect(onCommentSaving).toHaveBeenCalled());
    await waitFor(() =>
      expect(createAttachmentsMock).toHaveBeenCalledWith(
        {
          caseId: addCommentProps.caseId,
          attachments: [
            {
              type: COMMENT_ATTACHMENT_TYPE,
              data: { content: sampleData.comment },
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

  it('sends unified payload when config.attachments.enabled is true', async () => {
    getConfigMock.mockReturnValue(getCasesConfig(true));

    renderWithTestingProviders(<AddComment {...addCommentProps} />);

    const markdown = screen.getByTestId('euiMarkdownEditorTextArea');
    await userEvent.type(markdown, sampleData.comment);
    await userEvent.click(screen.getByTestId('submit-comment'));

    await waitFor(() => expect(onCommentSaving).toHaveBeenCalled());
    await waitFor(() =>
      expect(createAttachmentsMock).toHaveBeenCalledWith(
        {
          caseId: addCommentProps.caseId,
          attachments: [
            {
              type: COMMENT_ATTACHMENT_TYPE,
              data: { content: sampleData.comment },
            },
          ],
          caseOwner: SECURITY_SOLUTION_OWNER,
        },
        { onSuccess: expect.any(Function) }
      )
    );
  });

  describe('file tray', () => {
    const fileAttachment = {
      type: FILE_ATTACHMENT_TYPE,
      attachmentId: 'file-1',
      metadata: {
        files: [
          {
            name: 'report',
            extension: 'pdf',
            mimeType: 'application/pdf',
            created: '2026-11-09T10:00:00.000Z',
          },
        ],
        soType: FILE_SO_TYPE,
      },
    };

    it('sends a file attachment with the comment text', async () => {
      mockFileTray({ trayFile: uploadedTrayFile });
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      await userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), sampleData.comment);
      await userEvent.click(screen.getByTestId('submit-comment'));

      await waitFor(() =>
        expect(createAttachmentsMock).toHaveBeenCalledWith(
          {
            caseId: addCommentProps.caseId,
            attachments: [{ ...fileAttachment, data: { content: sampleData.comment } }],
            caseOwner: SECURITY_SOLUTION_OWNER,
          },
          { onSuccess: expect.any(Function), onError: expect.any(Function) }
        )
      );
      expect(resetFileTrayMock).toHaveBeenCalled();
    });

    it('deletes the uploaded file when sending fails', async () => {
      mockFileTray({ trayFile: uploadedTrayFile });
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      await userEvent.click(screen.getByTestId('submit-comment'));
      await waitFor(() => expect(createAttachmentsMock).toHaveBeenCalled());

      const [, { onError }] = createAttachmentsMock.mock.calls[0];
      onError();

      expect(deleteFileAttachmentsMock).toHaveBeenCalledWith({
        caseId: addCommentProps.caseId,
        fileIds: ['file-1'],
      });
    });

    it('sends a file without text', async () => {
      mockFileTray({ trayFile: uploadedTrayFile });
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      await userEvent.click(screen.getByTestId('submit-comment'));

      await waitFor(() =>
        expect(createAttachmentsMock).toHaveBeenCalledWith(
          expect.objectContaining({ attachments: [fileAttachment] }),
          expect.objectContaining({ onSuccess: expect.any(Function) })
        )
      );
    });

    it('disables submit while the file uploads', async () => {
      mockFileTray({ trayFile: { file: pdf, status: 'uploading' } });
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      await userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), sampleData.comment);

      expect(screen.getByTestId('submit-comment')).toBeDisabled();
    });

    it('adds dropped files to the tray', () => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      fireEvent.drop(screen.getByTestId('add-comment-drop-zone'), {
        dataTransfer: { files: [pdf], types: ['Files'] },
      });

      expect(addFilesMock).toHaveBeenCalledWith([pdf]);
    });

    it('adds pasted files to the tray', () => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      fireEvent.paste(screen.getByTestId('euiMarkdownEditorTextArea'), {
        clipboardData: { files: [pdf] },
      });

      expect(addFilesMock).toHaveBeenCalledWith([pdf]);
    });

    it('ignores drops when files are not supported', () => {
      mockFileTray({ isEnabled: false });
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      fireEvent.drop(screen.getByTestId('add-comment-drop-zone'), {
        dataTransfer: { files: [pdf], types: ['Files'] },
      });

      expect(addFilesMock).not.toHaveBeenCalled();
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
    mockFileTray();
    getConfigMock.mockReturnValue(getCasesConfig(false));
    useCreateAttachmentsMock.mockReturnValue({
      isLoading: false,
      mutate: createAttachmentsMock,
    });
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
      expect(onCommentSaving).toHaveBeenCalled();
    });

    expect(createAttachmentsMock).toHaveBeenCalledWith(
      {
        caseId: addCommentProps.caseId,
        attachments: [
          {
            type: COMMENT_ATTACHMENT_TYPE,
            data: { content: sampleData.comment },
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

describe('submit comment by key press', () => {
  beforeEach(() => {
    getConfigMock.mockReturnValue(getCasesConfig(false));
    useCreateAttachmentsMock.mockReturnValue({
      isLoading: false,
      mutate: createAttachmentsMock,
    });
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

  it.each(['ctrlKey', 'metaKey'])(
    'should add a comment on the keypress %s',
    async (modifierKey: string) => {
      renderWithTestingProviders(<AddComment {...addCommentProps} />);

      fireEvent.change(screen.getByLabelText('caseComment'), {
        target: { value: sampleData.comment },
      });

      await waitFor(() => {
        expect(screen.getByLabelText('caseComment')).toHaveValue(sessionStorage.getItem(draftKey));
      });

      fireEvent.keyDown(screen.getByLabelText('caseComment'), {
        key: 'Enter',
        code: 13,
        [modifierKey]: true,
      });

      await waitFor(() => {
        expect(onCommentSaving).toHaveBeenCalled();
      });

      expect(createAttachmentsMock).toHaveBeenCalledWith(
        {
          caseId: addCommentProps.caseId,
          attachments: [
            {
              type: COMMENT_ATTACHMENT_TYPE,
              data: { content: sampleData.comment },
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
    }
  );
});
