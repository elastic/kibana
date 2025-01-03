/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

import { GCSRepository } from '../../../../../../../common/types';

interface Props {
  repository: GCSRepository;
}

export const GCSDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    settings: {
      bucket,
      client,
      basePath,
      compress,
      chunkSize,
      readonly,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
    },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.bucketLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.clientLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.basePathLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.chunkSizeLabel"
          defaultMessage="Chunk size"
        />
      ),
      description: String(chunkSize),
    });
  }

  if (maxSnapshotBytesPerSec !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.maxSnapshotBytesLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.maxRestoreBytesLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeGCS.readonlyLabel"
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

      <EuiDescriptionList textStyle="reverse" listItems={listItems} />
    </Fragment>
  );
};
