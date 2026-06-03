/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

export interface SearchableSnapshotRepositoryInfoProps {
  defaultRepository: string;
  manageRepositoriesHref?: string;
}

export const SearchableSnapshotRepositoryInfo = ({
  defaultRepository,
  manageRepositoriesHref,
}: SearchableSnapshotRepositoryInfoProps) => {
  const manageLink = (chunks: React.ReactNode) =>
    manageRepositoriesHref ? (
      <EuiLink href={manageRepositoriesHref}>{chunks}</EuiLink>
    ) : (
      <>{chunks}</>
    );

  return (
    <FormattedMessage
      id="xpack.dataLifecyclePhases.searchableSnapshotRepositoryInfo.bodyWithDefaultRepository"
      defaultMessage="All streams using a data stream lifecycle use the deployment's default snapshot repository, ‘{defaultRepository}’. To change the default repository, <manageLink>manage your repositories</manageLink>."
      values={{ defaultRepository, manageLink }}
    />
  );
};
