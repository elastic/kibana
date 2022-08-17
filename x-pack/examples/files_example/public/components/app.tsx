/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FilesClient, FilesClientResponses } from '@kbn/files-plugin/public';

const names = ['foo', 'bar', 'baz'];

import {
  EuiPageTemplate,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
// @ts-ignore
import imageBase64 from '!!raw-loader!../assets/image.png.base64';

interface FilesExampleAppDeps {
  basename: string;
  files: FilesClient;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

const columns: EuiInMemoryTableProps<FileJSON>['columns'] = [
  {
    field: 'name',
    name: 'Name',
  },
  {
    field: 'status',
    name: 'Status',
    render: (status: FileJSON['status']) =>
      status === 'READY' ? (
        <EuiIcon type="check" />
      ) : status === 'AWAITING_UPLOAD' ? (
        <EuiIcon type="clock" />
      ) : (
        <EuiIcon type="alert" />
      ),
  },
];

type ListResponse = FilesClientResponses['list'];

export const FilesExampleApp = ({ basename, notifications, http, files }: FilesExampleAppDeps) => {
  const { data, isLoading, error, refetch } = useQuery<ListResponse>(['files'], () => files.list());
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedItem, setSelectedItem] = useState<undefined | FileJSON>();

  const uploadImage = async () => {
    try {
      setIsUploadingImage(true);
      const { file } = await files.create({
        name: names[Math.floor(Math.random() * names.length)],
        alt: 'My image',
        meta: { myValue: 'test' },
        mimeType: 'image/png',
      });
      const blob = new Blob([imageBase64], { type: 'image/png' });
      await files.upload({ id: file.id, body: blob.stream() });
      refetch();
    } finally {
      setIsUploadingImage(false);
    }
  };

  const renderToolsRight = () => {
    return [
      <EuiButton
        onClick={uploadImage}
        isDisabled={isUploadingImage || isLoading}
        isLoading={isUploadingImage}
        iconType="exportAction"
      >
        Upload image
      </EuiButton>,
    ];
  };

  const items = data?.files ?? [];
  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: 'Files example',
      }}
    >
      <EuiInMemoryTable
        columns={columns.concat({
          name: 'Actions',
          actions: [
            {
              name: 'View',
              description: 'View file',
              render: (item) => (
                <EuiButtonIcon iconType="eye" onClick={() => setSelectedItem(item)} />
              ),
            },
          ],
        })}
        items={items}
        itemId="id"
        loading={isLoading}
        error={error ? JSON.stringify(error) : undefined}
        sorting
        search={{
          toolsRight: renderToolsRight(),
        }}
      />
    </EuiPageTemplate>
  );
};
