/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { SearchPlaceholder } from './search_placeholder';

export const ErrorMessage = () => {
  const errorMessage = (
    <>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchErrorHeading"
            defaultMessage="Search is currently unavailable"
          />
        </h2>
      </EuiTitle>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchError"
            defaultMessage="We couldn't complete your search. If the problem persists, contact your administrator."
          />
        </p>
      </EuiText>
    </>
  );

  return (
    <SearchPlaceholder customPlaceholderMessage={errorMessage} data-test-subj="nav-search-error" />
  );
};
