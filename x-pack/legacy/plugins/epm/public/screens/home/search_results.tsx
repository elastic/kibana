/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiTitle } from '@elastic/eui';
import { PackageList } from '../../../server/types';
import { PackageListGrid } from '../../components/package_list_grid';

interface SearchResultsProps {
  term: string;
  results: PackageList;
}

export function SearchResults({ term, results }: SearchResultsProps) {
  const title = 'Search results';
  return (
    <PackageListGrid
      title={title}
      list={results}
      showInstalledBadge={true}
      controls={
        <EuiTitle>
          <EuiText>
            {results.length} results for &quot;{term}&quot;
          </EuiText>
        </EuiTitle>
      }
    />
  );
}
