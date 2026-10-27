/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIllustration, EuiText, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { generatePreview } from '@elastic/eui-illustrations';
import { FormattedMessage } from '@kbn/i18n-react';

interface SearchPlaceholderProps {
  customPlaceholderMessage?: React.ReactNode;
  'data-test-subj'?: string;
}

export const SearchPlaceholder = ({
  customPlaceholderMessage,
  'data-test-subj': dataTestSubj = 'nav-search-no-results',
}: SearchPlaceholderProps) => {
  return (
    <EuiFlexGroup
      style={{ minHeight: 300 }}
      data-test-subj={dataTestSubj}
      direction="column"
      gutterSize="xs"
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <EuiIllustration
          type={generatePreview}
          alt=""
          fullWidth={false}
          style={{ maxInlineSize: 200, marginInline: 'auto' }}
        />

        {customPlaceholderMessage ?? (
          <>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.globalSearchBar.searchBar.noResultsHeading"
                  defaultMessage="No results found"
                />
              </h2>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.globalSearchBar.searchBar.noResults"
                  defaultMessage="Try searching for applications, dashboards, visualizations, and more."
                />
              </p>
            </EuiText>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
