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

import type { CaseUI } from '../../../../common/ui/types';
import type { CaseFilesFilteringOptions } from '../../../containers/use_get_case_files';

import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { FilesTable } from '../../attachments/file/files_table';
import { FilesUtilityBar } from '../../attachments/file/files_utility_bar';

interface CaseViewFilesProps {
  caseData: CaseUI;
  searchTerm?: string;
}

export const DEFAULT_CASE_FILES_FILTERING_OPTIONS = {
  page: 0,
  perPage: 10,
};

export const CaseViewFiles = ({ caseData, searchTerm }: CaseViewFilesProps) => {
  const searchTermRef = useRef<string | undefined>(searchTerm);
  const [filteringOptions, setFilteringOptions] = useState<CaseFilesFilteringOptions>({
    ...DEFAULT_CASE_FILES_FILTERING_OPTIONS,
    ...(searchTerm && { searchTerm }),
  });

  useEffect(() => {
    if (searchTermRef.current !== searchTerm) {
      searchTermRef.current = searchTerm;
      setFilteringOptions((prev) => ({
        // reset pagination when search term changes
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
      totalItemCount: caseFiles?.total ?? 0,
      pageSizeOptions: [10, 25, 50],
      showPerPageOptions: true,
    }),
    [filteringOptions.page, filteringOptions.perPage, caseFiles?.total]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <FilesUtilityBar caseId={caseData.id} />
        <FilesTable
          caseId={caseData.id}
          isLoading={isLoading}
          items={caseFiles?.files ?? []}
          onChange={onTableChange}
          pagination={pagination}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewFiles.displayName = 'CaseViewFiles';
