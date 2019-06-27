/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { Direction } from '../../../../graphql/types';

import { SortDirection } from '.';

enum SortDirectionIndicatorEnum {
  SORT_UP = 'sortUp',
  SORT_DOWN = 'sortDown',
}

export type SortDirectionIndicator = undefined | SortDirectionIndicatorEnum;

/** Returns the symbol that corresponds to the specified `SortDirection` */
export const getDirection = (sortDirection: SortDirection): SortDirectionIndicator => {
  switch (sortDirection) {
    case Direction.asc:
      return SortDirectionIndicatorEnum.SORT_UP;
    case Direction.desc:
      return SortDirectionIndicatorEnum.SORT_DOWN;
    case 'none':
      return undefined;
    default:
      throw new Error('Unhandled sort direction');
  }
};

interface Props {
  sortDirection: SortDirection;
}

/** Renders a sort indicator */
export const SortIndicator = pure<Props>(({ sortDirection }) => (
  <EuiIcon data-test-subj="sortIndicator" type={getDirection(sortDirection) || 'empty'} />
));
