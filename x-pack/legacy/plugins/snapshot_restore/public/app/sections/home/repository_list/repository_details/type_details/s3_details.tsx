/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { S3Repository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

interface Props {
  repository: S3Repository;
}

export const S3Details: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    settings: {
      bucket,
      client,
      basePath,
      compress,
      chunkSize,
      serverSideEncryption,
      bufferSize,
      cannedAcl,
      storageClass,
      readonly,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
    },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.bucketLabel"
          defaultMessage="Bucket"
        />
      ),
      description: bucket || '',
    },
  ];

  if (client !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.clientLabel"
          defaultMessage="Client"
        />
      ),
      description: client,
    });
  }

  if (basePath !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.basePathLabel"
          defaultMessage="Base path"
        />
      ),
      description: basePath,
    });
  }

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.compressLabel"
          defaultMessage="Snapshot compression"
        />
      ),
      description: String(compress),
    });
  }

  if (chunkSize !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunkSize),
    });
  }

  if (serverSideEncryption !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.serverSideEncryptionLabel"
          defaultMessage="Server-side encryption"
        />
      ),
      description: String(serverSideEncryption),
    });
  }

  if (bufferSize !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.bufferSizeLabel"
          defaultMessage="Buffer size"
        />
      ),
      description: bufferSize,
    });
  }

  if (cannedAcl !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.cannedAclLabel"
          defaultMessage="Canned ACL"
        />
      ),
      description: cannedAcl,
    });
  }

  if (storageClass !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.storageClassLabel"
          defaultMessage="Storage class"
        />
      ),
      description: storageClass,
    });
  }

  if (maxSnapshotBytesPerSec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.maxSnapshotBytesLabel"
          defaultMessage="Max snapshot bytes per second"
        />
      ),
      description: maxSnapshotBytesPerSec,
    });
  }

  if (maxRestoreBytesPerSec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.maxRestoreBytesLabel"
          defaultMessage="Max restore bytes per second"
        />
      ),
      description: maxRestoreBytesPerSec,
    });
  }

  if (readonly !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeS3.readonlyLabel"
          defaultMessage="Read-only"
        />
      ),
      description: String(readonly),
    });
  }

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.settingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiDescriptionList listItems={listItems} />
    </Fragment>
  );
};
