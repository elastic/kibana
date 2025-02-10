/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EcsFlat } from '@elastic/ecs';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiToken,
  EuiToolTip,
  type EuiBasicTableColumn,
  type EuiSearchBarProps,
} from '@elastic/eui';

interface FieldObject {
  type: string;
  name: string;
  value: string;
}

export const getIconFromType = (type: string | null | undefined) => {
  switch (type) {
    case 'string':
      return 'tokenString';
    case 'keyword':
      return 'tokenKeyword';
    case 'number':
    case 'long':
      return 'tokenNumber';
    case 'date':
      return 'tokenDate';
    case 'ip':
    case 'geo_point':
      return 'tokenGeo';
    case 'object':
      return 'tokenQuestionInCircle';
    case 'float':
      return 'tokenNumber';
    default:
      return 'tokenQuestionInCircle';
  }
};

const tooltipAnchorProps = { css: { display: 'flex' } };
const columns: Array<EuiBasicTableColumn<FieldObject>> = [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    render: (name: string, { type }) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {type ? (
              <EuiToolTip content={type} anchorProps={tooltipAnchorProps}>
                <EuiToken
                  data-test-subj={`field-${name}-icon`}
                  iconType={getIconFromType(type ?? null)}
                />
              </EuiToolTip>
            ) : (
              <EuiIcon type="questionInCircle" />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{name}</EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  },
  {
    field: 'value',
    name: 'Value',
    sortable: true,
  },
];

const search: EuiSearchBarProps = {
  box: {
    incremental: true,
    schema: true,
  },
};

const flattenDocument = (document?: object): FieldObject[] => {
  if (!document) {
    return [];
  }
  const fields: FieldObject[] = [];
  const flatten = (object: object, prefix = '') => {
    Object.entries(object).forEach(([key, value]) => {
      const name = `${prefix}${key}` as keyof typeof EcsFlat;
      if (!Array.isArray(value) && typeof value === 'object' && value !== null) {
        flatten(value, `${name}.`);
      } else {
        fields.push({ name, value, type: EcsFlat[name]?.type });
      }
    });
  };
  flatten(document);
  return fields;
};

interface FieldsTableProps {
  documents?: object[];
}
export const FieldsTable = React.memo<FieldsTableProps>(({ documents = [] }) => {
  const fields = useMemo(() => flattenDocument(documents[0]), [documents]);
  return (
    <EuiInMemoryTable
      items={fields}
      columns={columns}
      search={search}
      pagination={true}
      sorting={true}
    />
  );
});
FieldsTable.displayName = 'FieldsTable';
