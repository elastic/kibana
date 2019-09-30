/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiTitle } from '@elastic/eui';
import { IntegrationList } from '../../../common/types';
import { IntegrationListGrid } from '../../components/integration_list_grid';

interface SearchResultsProps {
  term: string;
  results: IntegrationList;
}

export function SearchResults({ term, results }: SearchResultsProps) {
  const title = 'Search results';
  return (
    <IntegrationListGrid
      title={title}
      list={results}
      showInstalledBadge={true}
      controls={
        <EuiTitle>
          <EuiText>
            {results.length} results for "{term}"
          </EuiText>
        </EuiTitle>
      }
    />
  );
}
