/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import React from 'react';
import { SearchPlaceholder } from './search_placeholder';

interface CharLimitExceededMessageProps {
  basePathUrl: string;
}

export const CharLimitExceededMessage = ({ basePathUrl }: CharLimitExceededMessageProps) => {
  const charLimitMessage = (
    <>
      <EuiText size="m">
        <p data-test-subj="searchCharLimitExceededMessageHeading">
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchCharLimitExceededHeading"
            defaultMessage="Search character limit exceeded"
          />
        </p>
      </EuiText>
      <p>
        <FormattedMessage
          id="xpack.globalSearchBar.searchBar.searchCharLimitExceeded"
          defaultMessage="Try searching for applications, dashboards, visualizations, and more."
        />
      </p>
    </>
  );

  return <SearchPlaceholder basePath={basePathUrl} customPlaceholderMessage={charLimitMessage} />;
};
