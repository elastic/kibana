/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable */
/* eslint-disable */
import React, { useState } from 'react';
import {
  EuiHealth,
  EuiCallOut,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiBasicTable,
  EuiSearchBar,
  EuiButton,
} from '@elastic/eui';

const tags = [
  { name: 'marketing', color: 'danger' },
  { name: 'finance', color: 'success' },
  { name: 'eng', color: 'success' },
  { name: 'sales', color: 'warning' },
  { name: 'ga', color: 'success' },
];

const types = ['dashboard', 'visualization', 'watch'];

const users = ['dewey', 'wanda', 'carrie', 'jmack', 'gabic'];

const items = [
  {
    id: 100001,
    status: 'open',
    type: types[0],
    tag: [tags[0].name, tags[1].name, tags[2].name],
    active: true,
    owner: users[0],
    followers: 19,
    comments: 7,
    stars: 3,
  },
  {
    id: 100002,
    status: 'open',
    type: types[1],
    tag: [tags[1].name, tags[4].name, tags[2].name],
    active: true,
    owner: users[2],
    followers: 15,
    comments: 6,
    stars: 2,
  },
  {
    id: 100003,
    status: 'closed',
    type: types[0],
    tag: [tags[2].name],
    active: true,
    owner: users[3],
    followers: 11,
    comments: 3,
    stars: 1,
  },
  {
    id: 100004,
    status: 'open',
    type: types[2],
    tag: [tags[2].name, tags[3].name],
    active: false,
    owner: users[2],
    followers: 14,
    comments: 8,
    stars: 4,
  },
];

const loadTags = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(
        tags.map(tag => ({
          value: tag.name,
          view: <EuiHealth color={tag.color}>{tag.name}</EuiHealth>,
        }))
      );
    }, 2000);
  });
};

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

export const CasesSearchBar = React.memo(() => {
  const [currentQuery, setQuery] = useState(initialQuery);
  const [currentError, setError] = useState(null);
  const [incremental, setIncremental] = useState(false);

  const onChange = ({ query, error }) => {
    if (error) {
      setError(error);
    } else {
      setError(null);
      setQuery(query);
    }
  };

  const toggleIncremental = () => setIncremental(!incremental);

  const renderBookmarks = () => (
    <>
      <p>{`Enter a query, or select one from a bookmark`}</p>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => setQuery('status:open owner:dewey')}>
            {`mine, open`}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => setQuery('status:closed owner:dewey')}>
            {`mine, closed`}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );

  const renderSearch = () => {
    const filters = [
      {
        type: 'field_value_toggle_group',
        field: 'status',
        items: [
          {
            value: 'open',
            name: 'Open',
          },
          {
            value: 'closed',
            name: 'Closed',
          },
        ],
      },
      {
        type: 'is',
        field: 'active',
        name: 'Active',
        negatedName: 'Inactive',
      },
      {
        type: 'field_value_toggle',
        name: 'Mine',
        field: 'owner',
        value: 'dewey',
      },
      {
        type: 'field_value_selection',
        field: 'tag',
        name: 'Tag',
        multiSelect: 'or',
        cache: 10000, // will cache the loaded tags for 10 sec
        options: () => loadTags(),
      },
    ];
    const schema = {
      strict: true,
      fields: {
        active: {
          type: 'boolean',
        },
        status: {
          type: 'string',
        },
        followers: {
          type: 'number',
        },
        comments: {
          type: 'number',
        },
        stars: {
          type: 'number',
        },
        created: {
          type: 'date',
        },
        owner: {
          type: 'string',
        },
        tag: {
          type: 'string',
          validate: value => {
            if (!tags.some(tag => tag.name === value)) {
              throw new Error(
                `unknown tag (possible values: ${tags.map(tag => tag.name).join(',')})`
              );
            }
          },
        },
      },
    };
    return (
      <EuiSearchBar
        query={currentQuery}
        box={{
          placeholder: 'e.g. type:visualization -is:active joe',
          incremental,
          schema,
        }}
        filters={filters}
        onChange={onChange}
      />
    );
  };

  const renderError = () => {
    if (!currentError) {
      return;
    }
    return (
      <>
        <EuiCallOut
          iconType="faceSad"
          color="danger"
          title={`Invalid search: ${currentError.message}`}
        />
        <EuiSpacer size="l" />
      </>
    );
  };

  const renderTable = () => {
    const columns = [
      {
        name: 'Type',
        field: 'type',
      },
      {
        name: 'Open',
        field: 'status',
        render: status => (status === 'open' ? 'Yes' : 'No'),
      },
      {
        name: 'Active',
        field: 'active',
        dataType: 'boolean',
      },
      {
        name: 'Tags',
        field: 'tag',
        render: itemTags =>
          itemTags.map((tag: string, key: number) =>
            key + 1 < itemTags.length ? `${tag}, ` : tag
          ),
      },
      {
        name: 'Owner',
        field: 'owner',
      },
      {
        name: 'Stats',
        width: '150px',
        render: item => {
          return (
            <div>
              <div>{`${item.stars} Stars`}</div>
              <div>{`${item.followers} Followers`}</div>
              <div>{`${item.comments} Comments`}</div>
            </div>
          );
        },
      },
    ];

    const queriedItems = EuiSearchBar.Query.execute(currentQuery, items, {
      defaultFields: ['owner', 'tag', 'type'],
    });

    return <EuiBasicTable items={queriedItems} columns={columns} />;
  };

  const content = renderError() || (
    <EuiFlexGroup>
      <EuiFlexItem grow={6}>{renderTable()}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>{renderBookmarks()}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>{renderSearch()}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSwitch label="Incremental" checked={incremental} onChange={toggleIncremental} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {content}
    </>
  );
});

CasesSearchBar.displayName = 'CasesSearchBar';
/* eslint-enable */
/* tslint:enable */
