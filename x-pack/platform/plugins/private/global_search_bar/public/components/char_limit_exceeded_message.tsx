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

export const CharLimitExceededMessage = () => {
  const charLimitMessage = (
    <>
      <EuiTitle size="s">
        <h2 data-test-subj="searchCharLimitExceededMessageHeading">
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchCharLimitExceededHeading"
            defaultMessage="Search character limit exceeded"
          />
        </h2>
      </EuiTitle>
        <p>
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchCharLimitExceeded"
            defaultMessage="Try searching for applications, dashboards, visualizations, and more."
          />
        </p>
      </EuiText>
    </>
  );

  return <SearchPlaceholder customPlaceholderMessage={charLimitMessage} />;
};
