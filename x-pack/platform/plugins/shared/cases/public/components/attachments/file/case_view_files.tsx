/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Criteria } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import type { CommonAttachmentTabViewProps } from '../../../client/attachment_framework/types';
import type { CaseFilesFilteringOptions } from '../../../containers/use_get_case_files';

import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { FilesTable } from './files_table';
import { FilesUtilityBar } from './files_utility_bar';
import { getFileIdsFromComments, getFilesFromComments } from './utils';

export const DEFAULT_CASE_FILES_FILTERING_OPTIONS = {
  page: 0,
  perPage: 10,
};

export const CaseViewFiles = ({ caseData, searchTerm }: CommonAttachmentTabViewProps) => {
  const searchTermRef = useRef<string | undefined>(searchTerm);
  const [filteringOptions, setFilteringOptions] = useState<CaseFilesFilteringOptions>({
    ...DEFAULT_CASE_FILES_FILTERING_OPTIONS,
    ...(searchTerm && { searchTerm }),
  });

  useEffect(() => {
    if (searchTermRef.current !== searchTerm) {
      searchTermRef.current = searchTerm;
      setFilteringOptions((prev) => ({
        page: 0,
        perPage: prev.perPage,
        ...(searchTerm && { searchTerm }),
      }));
    }
  }, [searchTerm, setFilteringOptions]);

  const {
    data: caseFiles,
    isLoading,
    isPreviousData,
  } = useGetCaseFiles({
    ...filteringOptions,
    caseId: caseData.id,
  });

  // Intersect the server response with file ids referenced by caseData.comments.
  // Comments are already filtered upstream (e.g. by the author filter), so this
  // keeps the table in sync with the accordion badge. When no client filter is
  // active the comment list mirrors every file in the case and the intersect is
  // a no-op. Pagination remains server-side; backend filtering by attachment id
  // (out of scope for this PR) will let totalItemCount reflect the filtered set
  // exactly even across pages.
  const allowedFileIds = useMemo(
    () => getFileIdsFromComments(caseData.comments, caseData.owner),
    [caseData.comments, caseData.owner]
  );

  const existingFiles = useMemo(
    () => getFilesFromComments(caseData.comments, caseData.owner),
    [caseData.comments, caseData.owner]
  );

  const visibleFiles = useMemo(
    () => (caseFiles?.files ?? []).filter((file) => allowedFileIds.has(file.id)),
    [caseFiles?.files, allowedFileIds]
  );

  const onTableChange = useCallback(
    ({ page }: Criteria<FileJSON>) => {
      if (page && !isPreviousData) {
        setFilteringOptions({
          ...filteringOptions,
          page: page.index,
          perPage: page.size,
        });
      }
    },
    [filteringOptions, isPreviousData]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: filteringOptions.page,
      pageSize: filteringOptions.perPage,
      totalItemCount: allowedFileIds.size,
      pageSizeOptions: [10, 25, 50],
      showPerPageOptions: true,
    }),
    [filteringOptions.page, filteringOptions.perPage, allowedFileIds.size]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <FilesUtilityBar caseId={caseData.id} existingFiles={existingFiles} />
        <FilesTable
          caseId={caseData.id}
          isLoading={isLoading}
          items={visibleFiles}
          onChange={onTableChange}
          pagination={pagination}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewFiles.displayName = 'CaseViewFiles';
