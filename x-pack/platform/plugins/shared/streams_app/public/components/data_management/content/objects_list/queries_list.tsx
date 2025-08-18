/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiCheckbox, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQuery } from '@kbn/streams-schema';

export function StreamQueriesList({
  definition,
  selectedQueries,
  setSelectedQueries,
  disabled,
}: {
  definition: { name: string; queries: StreamQuery[] };
  selectedQueries: StreamQuery[];
  setSelectedQueries: (queries: StreamQuery[]) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('xpack.streams.contentPackObjectsList.sigEvent', {
            defaultMessage: 'Significant events',
          })}
        </h5>
      </EuiTitle>

      <EuiBasicTable
        items={definition.queries}
        itemId={'id'}
        columns={[
          {
            field: 'select',
            name: '',
            width: '40px',
            render: (_, item: StreamQuery) => {
              return (
                <EuiCheckbox
                  id={`stream-checkbox-${item.id}`}
                  disabled={disabled}
                  checked={selectedQueries.some(({ id }) => id === item.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQueries([...selectedQueries, item]);
                    } else {
                      setSelectedQueries(selectedQueries.filter(({ id }) => id !== item.id));
                    }
                  }}
                />
              );
            },
          },
          {
            field: 'title',
            name: '',
            render: (_, item: StreamQuery) => (
              <EuiFlexItem grow={false}>
                <span>
                  {item.title} ({item.kql.query})
                </span>
              </EuiFlexItem>
            ),
          },
        ]}
      />
    </>
  );
}
