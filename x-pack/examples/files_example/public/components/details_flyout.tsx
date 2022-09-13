/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiTitle,
  EuiDescriptionList,
  EuiSpacer,
} from '@elastic/eui';
import type { FileJSON } from '@kbn/files-plugin/common';
import { FileClients } from '../types';

interface Props {
  file: FileJSON;
  files: FileClients;
  onDismiss: () => void;
}

export const DetailsFlyout: FunctionComponent<Props> = ({ files, file, onDismiss }) => {
  return (
    <EuiFlyout onClose={onDismiss}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{file.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          listItems={[
            {
              title: 'Name',
              description: file.name,
            },
            {
              title: 'Extension',
              description: file.extension ?? 'unknown',
            },
            {
              title: 'Size (bytes)',
              description: file.size ?? 'unknown',
            },
            {
              title: 'Status',
              description: file.status ?? 'unknown',
            },
            {
              title: 'Created at',
              description: moment(file.created).toLocaleString(),
            },
            {
              title: 'Last updated',
              description: moment(file.updated).fromNow(),
            },
          ]}
        />
        <EuiSpacer size="xl" />
        <img
          css={css`
            height: 400px;
          `}
          alt={file.alt ?? 'unknown'}
          src={files.example.getDownloadHref(file)}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="download"
              href={files.example.getDownloadHref(file)}
              download={file.name}
            >
              Download
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onDismiss}>
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
