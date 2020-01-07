/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import * as React from 'react';

import { EuiTableDataType } from '@elastic/eui';
import { NoteCard } from './note_card';
import * as i18n from './translations';

const Column = React.memo<{ text: string }>(({ text }) => <span>{text}</span>);
Column.displayName = 'Column';

interface Item {
  created: Date;
  note: string;
  user: string;
}

interface Column {
  field: string;
  dataType?: EuiTableDataType;
  name: string;
  sortable: boolean;
  truncateText: boolean;
  render: (value: string, item: Item) => JSX.Element;
}

export const columns: Column[] = [
  {
    field: 'note',
    dataType: 'string',
    name: i18n.NOTE,
    sortable: true,
    truncateText: false,
    render: (_, { created, note, user }) => (
      <NoteCard created={created} rawNote={note} user={user} />
    ),
  },
];
