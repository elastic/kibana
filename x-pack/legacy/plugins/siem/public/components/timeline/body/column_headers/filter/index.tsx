/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import * as React from 'react';

import { OnFilterChange } from '../../../events';
import { ColumnHeader } from '../column_header';
import { TextFilter } from '../text_filter';

interface Props {
  header: ColumnHeader;
  onFilterChange?: OnFilterChange;
}

/** Renders a header's filter, based on the `columnHeaderType` */
export const Filter = React.memo<Props>(({ header, onFilterChange = noop }) => {
  switch (header.columnHeaderType) {
    case 'text-filter':
      return (
        <TextFilter
          columnId={header.id}
          minWidth={header.width}
          onFilterChange={onFilterChange}
          placeholder={header.placeholder}
        />
      );
    case 'not-filtered': // fall through
    default:
      return null;
  }
});

Filter.displayName = 'Filter';
