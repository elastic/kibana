/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
  EuiEmptyPrompt,
} from '@elastic/eui';

export const FieldList = ({
  columns,
  fields,
  onRemoveField,
  addButton,
  emptyMessage,
  dataTestSubj,
  addActions,
}) => {
  let message;

  if (!fields.length) {
    message = (
      <EuiEmptyPrompt
        title={emptyMessage}
        titleSize="xs"
      />
    );
  }

  let extendedColumns;

  const actions = [
    addActions ? [ ...addActions() ] : [],
    // Remove field should always be last
    onRemoveField ? [{
      name: 'Remove',
      isPrimary: true,
      description: 'Remove this field',
      icon: 'trash',
      type: 'icon',
      color: 'danger',
      onClick: (field) => onRemoveField(field),
    }] : [],
  ].flatMap(action => action);

  if (actions.length) {
    extendedColumns = columns.concat({
      name: addActions ? 'Actions' : 'Remove',
      width: addActions ? '80px' : '120px',
      actions,
    });
  } else {
    extendedColumns = columns;
  }

  const search = {
    toolsRight: addButton ? addButton : undefined,
    box: {
      incremental: true,
      placeholder: 'Search',
    },
  };

  const pagination = {
    initialPageSize: 200,
    pageSizeOptions: [20, 100, 200]
  };

  return (
    <EuiInMemoryTable
      items={fields}
      itemId="name"
      columns={extendedColumns}
      search={search}
      pagination={pagination}
      sorting={true}
      message={message}
      data-test-subj={dataTestSubj}
    />
  );
};

FieldList.propTypes = {
  columns: PropTypes.array.isRequired,
  fields: PropTypes.array.isRequired,
  onRemoveField: PropTypes.func,
  addButton: PropTypes.node,
  emptyMessage: PropTypes.node,
  dataTestSubj: PropTypes.string,
};
