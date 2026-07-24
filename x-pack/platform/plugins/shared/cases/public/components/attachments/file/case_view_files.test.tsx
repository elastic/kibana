/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { CaseUI } from '../../../../common';
import { AttachmentType, ExternalReferenceStorageType } from '../../../../common/types/domain';
import type { AttachmentUIV2 } from '../../../../common/ui/types';

import { alertCommentWithIndices, basicCase, elasticUser } from '../../../containers/mock';
import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { CaseViewFiles, DEFAULT_CASE_FILES_FILTERING_OPTIONS } from './case_view_files';
import { renderWithTestingProviders } from '../../../common/mock';

jest.mock('../../../containers/use_get_case_files');

const useGetCaseFilesMock = useGetCaseFiles as jest.Mock;

export const makeFileComment = (
  id: string,
  attachmentId: string | string[],
  owner: string
): AttachmentUIV2 =>
  ({
    type: AttachmentType.externalReference,
    id,
    externalReferenceId: 'ext',
    externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
    externalReferenceAttachmentTypeId: '.files',
    externalReferenceMetadata: { files: [] },
    attachmentId,
    createdAt: '2024-01-01T00:00:00.000Z',
    createdBy: elasticUser,
    owner,
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'v',
  } as unknown as AttachmentUIV2);

const makeFile = (id: string, name = id): Partial<FileJSON> => ({
  id,
  name,
  fileKind: 'cases',
  mimeType: 'text/plain',
  status: 'READY',
  created: '2024-01-01T00:00:00.000Z',
  updated: '2024-01-01T00:00:00.000Z',
});

const fileIds = Array.from({ length: 11 }, (_, i) => `file-${i}`);
const fileComments = fileIds.map((id) => makeFileComment(`c-${id}`, id, basicCase.owner));

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, ...fileComments, alertCommentWithIndices],
};

describe('Case View Page files tab', () => {
  useGetCaseFilesMock.mockReturnValue({
    data: { files: [], total: 11 },
    isLoading: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the utility bar for the files table', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect((await screen.findAllByTestId('cases-files-add')).length).toBe(2);
  });

  it('should render the files table', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();
  });

  it('clicking table pagination triggers calls to useGetCaseFiles', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('pagination-button-next'));

    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page + 1,
        perPage: DEFAULT_CASE_FILES_FILTERING_OPTIONS.perPage,
      })
    );
  });

  it('changing perPage value triggers calls to useGetCaseFiles', async () => {
    const targetPagination = 50;

    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('tablePaginationPopoverButton'));

    const pageSizeOption = screen.getByTestId('tablePagination-50-rows');

    pageSizeOption.style.pointerEvents = 'all';

    await userEvent.click(pageSizeOption);

    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page,
        perPage: targetPagination,
      })
    );
  });

  it('search by word triggers calls to useGetCaseFiles', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} searchTerm="search" />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();
    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page,
        perPage: DEFAULT_CASE_FILES_FILTERING_OPTIONS.perPage,
        searchTerm: 'search',
      })
    );
  });

  describe('intersect with caseData.comments', () => {
    it('only renders files whose ids are referenced by the (possibly filtered) comments', async () => {
      // Server returns three files but the (author-filtered) comments only
      // reference one of them. Only the referenced file should render.
      useGetCaseFilesMock.mockReturnValue({
        data: {
          files: [makeFile('file-a'), makeFile('file-b'), makeFile('file-c')],
          total: 3,
        },
        isLoading: false,
      });

      const filteredCaseData: CaseUI = {
        ...basicCase,
        comments: [makeFileComment('c-a', 'file-a', basicCase.owner)],
      };

      renderWithTestingProviders(<CaseViewFiles caseData={filteredCaseData} />);

      expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();
      expect(await screen.findByTestId('cases-files-table-row-file-a')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-files-table-row-file-b')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cases-files-table-row-file-c')).not.toBeInTheDocument();
    });
  });
});
