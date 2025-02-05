/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SearchFilterConfig } from '@elastic/eui/src/components/search_bar/search_filters';
import { SchemaType } from '@elastic/eui/src/components/search_bar/search_bar';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui/src/components/search_bar/search_bar';
import { EuiButton, EuiCallOut, EuiSearchBar, EuiSpacer, Query } from '@elastic/eui';
import { SnapshotDeleteProvider } from '../../../../components';
import { SnapshotDetails } from '../../../../../../common/types';
import {
  getQueryFromListParams,
  SnapshotListParams,
  getListParams,
  escapeString,
} from '../../../../lib';

const SEARCH_DEBOUNCE_VALUE_MS = 200;

const onlyOneClauseMessage = i18n.translate(
  'xpack.snapshotRestore.snapshotList.searchBar.onlyOneClauseMessage',
  {
    defaultMessage: 'You can only use one clause in the search bar',
  }
);
// for now limit the search bar to snapshot, repository and policyName queries
const searchSchema: SchemaType = {
  strict: true,
  fields: {
    snapshot: {
      type: 'string',
    },
    repository: {
      type: 'string',
    },
    policyName: {
      type: 'string',
    },
  },
};

interface Props {
  listParams: SnapshotListParams;
  setListParams: (listParams: SnapshotListParams) => void;
  reload: () => void;
  selectedItems: SnapshotDetails[];
  onSnapshotDeleted: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void;
  repositories: string[];
}

export const SnapshotSearchBar: React.FunctionComponent<Props> = ({
  listParams,
  setListParams,
  reload,
  selectedItems,
  onSnapshotDeleted,
  repositories,
}) => {
  const [cachedListParams, setCachedListParams] = useState<SnapshotListParams>(listParams);
  // send the request after the user has stopped typing
  useDebounce(
    () => {
      setListParams(cachedListParams);
    },
    SEARCH_DEBOUNCE_VALUE_MS,
    [cachedListParams]
  );

  const deleteButton = selectedItems.length ? (
    <SnapshotDeleteProvider>
      {(
        deleteSnapshotPrompt: (
          ids: Array<{ snapshot: string; repository: string }>,
          onSuccess?: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void
        ) => void
      ) => {
        return (
          <EuiButton
            onClick={() =>
              deleteSnapshotPrompt(
                selectedItems.map(({ snapshot, repository }) => ({ snapshot, repository })),
                onSnapshotDeleted
              )
            }
            color="danger"
            data-test-subj="srSnapshotListBulkDeleteActionButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.table.deleteSnapshotButton"
              defaultMessage="Delete {count, plural, one {snapshot} other {snapshots}}"
              values={{
                count: selectedItems.length,
              }}
            />
          </EuiButton>
        );
      }}
    </SnapshotDeleteProvider>
  ) : (
    []
  );
  const searchFilters: SearchFilterConfig[] = [
    {
      type: 'field_value_selection' as const,
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.repositoryFilterLabel', {
        defaultMessage: 'Repository',
      }),
      operator: 'exact',
      multiSelect: false,
      options: repositories.map((repository) => ({
        value: repository,
        view: repository,
      })),
    },
  ];

  const reloadButton = (
    <EuiButton color="success" iconType="refresh" onClick={reload} data-test-subj="reloadButton">
      <FormattedMessage
        id="xpack.snapshotRestore.snapshotList.table.reloadSnapshotsButton"
        defaultMessage="Reload"
      />
    </EuiButton>
  );

  const [query, setQuery] = useState<Query>(getQueryFromListParams(listParams, searchSchema));
  const [error, setError] = useState<Error | null>(null);

  const onSearchBarChange = (args: EuiSearchBarOnChangeArgs) => {
    const { query: changedQuery, error: queryError } = args;

    if (changedQuery) {
      changedQuery.text = escapeString(changedQuery.text);

      setError(null);
      setQuery(changedQuery);
      if (changedQuery.ast.clauses.length > 1) {
        setError({ name: onlyOneClauseMessage, message: onlyOneClauseMessage });
      } else {
        setCachedListParams(getListParams(listParams, changedQuery));
      }
    } else if (queryError) {
      setError(queryError);
    }
  };

  return (
    <>
      <EuiSearchBar
        filters={searchFilters}
        query={query}
        onChange={onSearchBarChange}
        toolsLeft={deleteButton}
        toolsRight={reloadButton}
        box={{ schema: searchSchema, incremental: true, 'data-test-subj': 'snapshotListSearch' }}
      />
      <EuiSpacer />
      {error ? (
        <>
          <EuiCallOut
            data-test-subj="snapshotListSearchError"
            iconType="warning"
            color="danger"
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.searchBar.invalidSearchMessage"
                defaultMessage="Invalid search: {errorMessage}"
                values={{
                  errorMessage: error.message,
                }}
              />
            }
          />
          <EuiSpacer />
        </>
      ) : null}
    </>
  );
};
