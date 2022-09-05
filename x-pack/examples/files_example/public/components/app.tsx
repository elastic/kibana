/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FilesClientResponses } from '@kbn/files-plugin/public';

const names = ['foo', 'bar', 'baz'];

import {
  EuiPageTemplate,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiLink,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { DetailsFlyout } from './details_flyout';
import type { FileClients } from '../types';
import { ConfirmButtonIcon } from './confirm_button';
// @ts-ignore
import imageBase64 from '!!raw-loader!../assets/image.png.base64';

interface FilesExampleAppDeps {
  files: FileClients;
  notifications: CoreStart['notifications'];
}

type ListResponse = FilesClientResponses['list'];

export const FilesExampleApp = ({ files, notifications }: FilesExampleAppDeps) => {
  const { data, isLoading, error, refetch } = useQuery<ListResponse>(['files'], () =>
    files.example.list()
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<undefined | FileJSON>();

  const uploadImage = async () => {
    try {
      setIsUploadingImage(true);
      const { file } = await files.example.create({
        name: names[Math.floor(Math.random() * names.length)],
        alt: 'My image',
        meta: { myValue: 'test' },
        mimeType: 'image/png',
      });
      await refetch();
      const blob = new Blob([Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0))], {
        type: 'image/png',
      });
      await files.example.upload({ id: file.id, body: blob });
      await refetch();
      notifications.toasts.addSuccess('Sucessfully uploaded image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const renderToolsRight = () => {
    return [
      <EuiButton
        onClick={uploadImage}
        isDisabled={isUploadingImage || isLoading || isDeletingFile}
        isLoading={isUploadingImage}
        iconType="exportAction"
      >
        Upload image
      </EuiButton>,
    ];
  };

  const items = [...(data?.files ?? [])].reverse();

  const columns: EuiInMemoryTableProps<FileJSON>['columns'] = [
    {
      field: 'name',
      name: 'Name',
      render: (name, item) => <EuiLink onClick={() => setSelectedItem(item)}>{name}</EuiLink>,
    },
    {
      field: 'status',
      name: 'Status',
      render: (status: FileJSON['status']) =>
        status === 'READY' ? (
          <EuiIcon color="success" type="checkInCircleFilled" aria-label={status} />
        ) : status === 'AWAITING_UPLOAD' ? (
          <EuiIcon type="clock" aria-label={status} />
        ) : (
          <EuiIcon color="danger" type="alert" arial-label={status} />
        ),
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'View',
          description: 'View file',
          isPrimary: true,
          render: (item) => (
            <EuiButtonIcon
              aria-label="View file details"
              iconType="eye"
              onClick={() => setSelectedItem(item)}
            />
          ),
        },
        {
          name: 'Delete',
          description: 'Delete this file',
          render: (item) => (
            <ConfirmButtonIcon
              disabled={isDeletingFile}
              label="Delete this file"
              confirmationText="Are you sure you want to delete this file?"
              onConfirm={async () => {
                try {
                  setIsDeletingFile(true);
                  await files.example.delete({ id: item.id });
                  await refetch();
                } finally {
                  setIsDeletingFile(false);
                }
              }}
            />
          ),
        },
      ],
    },
  ];

  return (
    <>
      <EuiPageTemplate
        pageHeader={{
          pageTitle: 'Files example',
        }}
      >
        <EuiInMemoryTable
          columns={columns}
          items={items}
          itemId="id"
          loading={isLoading || isDeletingFile}
          error={error ? JSON.stringify(error) : undefined}
          sorting
          search={{
            toolsRight: renderToolsRight(),
          }}
          pagination
        />
      </EuiPageTemplate>
      {selectedItem && (
        <DetailsFlyout
          files={files}
          file={selectedItem}
          onDismiss={() => setSelectedItem(undefined)}
        />
      )}
    </>
  );
};
