/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

import { FSRepository } from '../../../../../../../common/types';

interface Props {
  repository: FSRepository;
}

export const FSDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    settings: {
      location,
      compress,
      chunkSize,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
      readonly,
    },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.locationLabel"
          defaultMessage="Location"
        />
      ),
      description: location,
    },
  ];

  if (compress !== undefined) {
    listItems.push({
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeFS.compressLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeFS.chunkSizeLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeFS.maxSnapshotBytesLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeFS.maxRestoreBytesLabel"
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
          id="xpack.snapshotRestore.repositoryDetails.typeFS.readonlyLabel"
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
