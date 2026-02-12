/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiHealth,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage, FormattedDate } from '@kbn/i18n-react';
import type { EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';

export interface FileData {
  path: string;
  filename: string;
  size: number;
  mtime: number;
  type: string;
  file_type: 'file' | 'folder';
  md5?: string;
  sha256?: string;
}

interface FileTableProps {
  data: FileData[];
  onPathNavigation: (path: string, name: string) => void;
  currentPath: string;
  isLoading?: boolean;
}

export const FileTable: React.FC<FileTableProps> = ({
  data,
  onPathNavigation,
  currentPath,
  isLoading = false,
}) => {
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 0) return '-';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const handleFileClick = useCallback((item: FileData) => {
    if (item.file_type === 'folder' || item.type === 'directory') {
      const newPath = item.path.endsWith('/') ? item.path : `${item.path}/`;
      onPathNavigation(newPath, item.filename);
    }
  }, [onPathNavigation]);

  const getFileIcon = useCallback((item: FileData) => {
    if (item.file_type === 'folder' || item.type === 'directory') {
      return 'folder';
    }
    
    const extension = item.filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'exe':
      case 'app':
        return 'gear';
      case 'txt':
      case 'log':
        return 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'pdf':
        return 'document';
      case 'zip':
      case 'tar':
      case 'gz':
        return 'package';
      default:
        return 'document';
    }
  }, []);

  const columns: Array<EuiBasicTableColumn<FileData>> = useMemo(
    () => [
      {
        field: 'filename',
        name: (
          <FormattedMessage
            id="xpack.osquery.fileTable.nameColumn"
            defaultMessage="Name"
          />
        ),
        sortable: true,
        render: (filename: string, item: FileData) => {
          const isClickable = item.file_type === 'folder' || item.type === 'directory';
          const icon = getFileIcon(item);
          
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                {isClickable ? (
                  <EuiLink onClick={() => handleFileClick(item)} style={{ cursor: 'pointer' }}>
                    <EuiText size="s">
                      <strong>{filename}</strong>
                    </EuiText>
                  </EuiLink>
                ) : (
                  <EuiText size="s">{filename}</EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        width: '40%',
      },
      {
        field: 'size',
        name: (
          <FormattedMessage
            id="xpack.osquery.fileTable.sizeColumn"
            defaultMessage="Size"
          />
        ),
        sortable: true,
        render: (size: number, item: FileData) => {
          if (item.file_type === 'folder' || item.type === 'directory') {
            return <EuiText size="s" color="subdued">-</EuiText>;
          }
          return <EuiText size="s">{formatFileSize(size)}</EuiText>;
        },
        width: '15%',
      },
      {
        field: 'mtime',
        name: (
          <FormattedMessage
            id="xpack.osquery.fileTable.modifiedColumn"
            defaultMessage="Modified"
          />
        ),
        sortable: true,
        render: (mtime: number) => {
          if (!mtime || mtime === 0) {
            return <EuiText size="s" color="subdued">-</EuiText>;
          }
          
          // Convert unix timestamp to Date
          const date = new Date(mtime * 1000);
          return (
            <EuiText size="s">
              <FormattedDate
                value={date}
                year="numeric"
                month="short"
                day="2-digit"
                hour="2-digit"
                minute="2-digit"
              />
            </EuiText>
          );
        },
        width: '20%',
      },
      {
        field: 'type',
        name: (
          <FormattedMessage
            id="xpack.osquery.fileTable.typeColumn"
            defaultMessage="Type"
          />
        ),
        sortable: true,
        render: (type: string, item: FileData) => {
          let displayType = type;
          let color: 'success' | 'primary' | 'accent' | 'warning' | 'danger' | undefined = 'primary';
          
          if (item.file_type === 'folder' || type === 'directory') {
            displayType = 'Directory';
            color = 'success';
          } else if (type === 'regular') {
            displayType = 'File';
            color = 'primary';
          } else if (type === 'symlink') {
            displayType = 'Symlink';
            color = 'warning';
          }
          
          return (
            <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
              <EuiText size="s">{displayType}</EuiText>
            </EuiHealth>
          );
        },
        width: '15%',
      },
      {
        field: 'md5',
        name: (
          <FormattedMessage
            id="xpack.osquery.fileTable.hashColumn"
            defaultMessage="Hash"
          />
        ),
        render: (md5: string, item: FileData) => {
          if (!md5 && !item.sha256) {
            return <EuiText size="s" color="subdued">-</EuiText>;
          }
          
          const hashToShow = item.sha256 || md5;
          const hashType = item.sha256 ? 'SHA256' : 'MD5';
          const truncatedHash = hashToShow ? `${hashToShow.substring(0, 8)}...` : '';
          
          return (
            <EuiToolTip content={`${hashType}: ${hashToShow}`}>
              <EuiText size="s" style={{ fontFamily: 'monospace' }}>
                {truncatedHash}
              </EuiText>
            </EuiToolTip>
          );
        },
        width: '10%',
      },
    ],
    [formatFileSize, getFileIcon, handleFileClick]
  );

  // Sort data to show directories first, then files
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      // Directories first
      if (a.file_type === 'folder' && b.file_type !== 'folder') return -1;
      if (a.file_type !== 'folder' && b.file_type === 'folder') return 1;
      // Then alphabetically by filename
      return a.filename.localeCompare(b.filename);
    });
  }, [data]);

  const [sorting, setSorting] = useState<EuiTableSortingType<FileData>>({ 
    sort: { field: 'filename', direction: 'asc' } 
  });

  const onTableChange = useCallback(({ sort }: { sort?: { field: keyof FileData; direction: 'asc' | 'desc' } }) => {
    if (sort) {
      setSorting({ sort });
    }
  }, []);

  return (
    <EuiBasicTable
      items={sortedData}
      columns={columns}
      loading={isLoading}
      pagination={{
        pageIndex: 0,
        pageSize: 50,
        totalItemCount: sortedData.length,
        pageSizeOptions: [25, 50, 100],
      }}
      sorting={sorting}
      onChange={onTableChange}
      noItemsMessage={
        <FormattedMessage
          id="xpack.osquery.fileTable.noFilesMessage"
          defaultMessage="No files or directories found"
        />
      }
    />
  );
};
