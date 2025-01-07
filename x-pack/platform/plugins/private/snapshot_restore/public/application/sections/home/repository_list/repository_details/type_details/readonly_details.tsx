/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';

import { ReadonlyRepository } from '../../../../../../../common/types';

interface Props {
  repository: ReadonlyRepository;
}

export const ReadonlyDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    settings: { url },
  } = repository;

  const listItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryDetails.typeReadonly.urlLabel"
          defaultMessage="URL"
        />
      ),
      description: url,
    },
  ];

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
