/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';

import type { Pagination, EuiBasicTableProps } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import {
  EuiBasicTable,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import type { AttachmentRemovalOptions } from '../../../client/attachment_framework/types';
import { RemoveSelectedAttachments } from '../common/remove_selected_attachments';
import { useAttachmentSelection } from '../common/use_attachment_selection';
import * as i18n from './translations';
import { useFilesTableColumns } from './use_files_table_columns';
import { FilePreview } from './file_preview';
import { AddFile } from './add_file';
import { useFilePreview } from './use_file_preview';

const EmptyFilesTable = ({ caseId }: { caseId: string }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_FILES}</h3>}
    data-test-subj="cases-files-table-empty"
    titleSize="xs"
    actions={<AddFile caseId={caseId} />}
  />
);

EmptyFilesTable.displayName = 'EmptyFilesTable';

interface FilesTableProps {
  caseId: string;
  isLoading: boolean;
  items: FileJSON[];
  onChange: EuiBasicTableProps<FileJSON>['onChange'];
  pagination: Pagination;
  onRemove?: (fileIds: string[], options?: AttachmentRemovalOptions) => void;
  isRemoving?: boolean;
}

const getFileId = ({ id }: FileJSON): string => id;

export const FilesTable = ({
  caseId,
  items,
  pagination,
  onChange,
  isLoading,
  onRemove,
  isRemoving,
}: FilesTableProps) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();

  const { selection, selectedIds, clearSelection } = useAttachmentSelection({
    items,
    getId: getFileId,
    enabled: onRemove != null,
  });

  const onRemoveSelected = useCallback(
    () => onRemove?.(selectedIds, { onSuccess: clearSelection }),
    [onRemove, selectedIds, clearSelection]
  );

  const [selectedFile, setSelectedFile] = useState<FileJSON>();

  const displayPreview = (file: FileJSON) => {
    setSelectedFile(file);
    showPreview();
  };

  const filesTableRowProps = useCallback(
    (file: FileJSON) => ({
      'data-test-subj': `cases-files-table-row-${file.id}`,
    }),
    []
  );

  const columns = useFilesTableColumns({ caseId, showPreview: displayPreview });

  return isLoading ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-files-table-loading" lines={10} />
    </>
  ) : (
    <>
      {pagination.totalItemCount > 0 && (
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="cases-files-table-results-count">
              {i18n.SHOWING_FILES(items.length)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RemoveSelectedAttachments
              count={selectedIds.length}
              onRemove={onRemoveSelected}
              isRemoving={isRemoving}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.FILES_TABLE}
        items={items}
        itemId="id"
        selection={selection}
        rowHeader="name"
        columns={columns}
        pagination={pagination}
        onChange={onChange}
        data-test-subj="cases-files-table"
        noItemsMessage={<EmptyFilesTable caseId={caseId} />}
        rowProps={filesTableRowProps}
      />
      {isPreviewVisible && selectedFile !== undefined && (
        <FilePreview closePreview={closePreview} selectedFile={selectedFile} />
      )}
    </>
  );
};

FilesTable.displayName = 'FilesTable';
