/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiTitle } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { SearchPlaceholder } from './search_placeholder';
import type { SearchErrorType } from './types';

const ERROR_COPY: Record<SearchErrorType, { title: ReactNode; body: ReactNode }> = {
  license: {
    title: (
      <FormattedMessage
        id="xpack.globalSearchBar.searchBar.searchLicenseErrorTitle"
        defaultMessage="Search isn't available with your current license"
      />
    ),
    body: (
      <FormattedMessage
        id="xpack.globalSearchBar.searchBar.searchLicenseErrorDescription"
        defaultMessage="Check the license status of your deployment or contact your administrator."
      />
    ),
  },
  generic: {
    title: (
      <FormattedMessage
        id="xpack.globalSearchBar.searchBar.searchErrorTitle"
        defaultMessage="Search is currently unavailable"
      />
    ),
    body: (
      <FormattedMessage
        id="xpack.globalSearchBar.searchBar.searchErrorDescription"
        defaultMessage="We couldn't complete your search. If the problem persists, contact your administrator."
      />
    ),
  },
};

interface ErrorMessageProps {
  type: SearchErrorType;
}

export const ErrorMessage = ({ type }: ErrorMessageProps) => {
  const { title, body } = ERROR_COPY[type];

  const errorMessage = (
    <>
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiText>
        <p>{body}</p>
      </EuiText>
    </>
  );

  return (
    <SearchPlaceholder
      customPlaceholderMessage={errorMessage}
      data-test-subj={`nav-search-error-${type}`}
    />
  );
};
