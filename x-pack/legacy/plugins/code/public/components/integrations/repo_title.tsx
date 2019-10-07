/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { RepositoryUtils } from '../../../common/repository_utils';

export const RepoTitle = ({ uri }: { uri: string }) => {
  const org = RepositoryUtils.orgNameFromUri(uri);
  const name = RepositoryUtils.repoNameFromUri(uri);

  return (
    <EuiText size="s" className="codeIntegrations__snippet-title">
      <span>{org}/</span>
      <span className="codeIntegrations__text--bold">{name}</span>
    </EuiText>
  );
};
