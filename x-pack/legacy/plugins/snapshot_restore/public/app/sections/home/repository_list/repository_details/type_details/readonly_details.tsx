/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ReadonlyRepository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

interface Props {
  repository: ReadonlyRepository;
}

export const ReadonlyDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
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
