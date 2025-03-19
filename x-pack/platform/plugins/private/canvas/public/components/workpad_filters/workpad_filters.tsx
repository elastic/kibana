/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { State, FilterField, PositionedElement } from '../../../types';
import { groupFiltersBy, getFiltersExprsFromExpression } from '../../lib/filter';
import { setGroupFiltersByOption } from '../../state/actions/sidebar';
import { getGroupFiltersByOption } from '../../state/selectors/sidebar';
import { useCanvasFilters } from './hooks';
import { WorkpadFilters as Component } from './workpad_filters.component';

interface Props {
  element?: PositionedElement | null;
}

export const WorkpadFilters: FC<Props> = ({ element }) => {
  const groupFiltersByField: FilterField = useSelector((state: State) =>
    getGroupFiltersByOption(state)
  );

  const dispatch = useDispatch();

  const onGroupByChange = useCallback(
    (groupByOption: FilterField) => {
      dispatch(setGroupFiltersByOption(groupByOption));
    },
    [dispatch]
  );
  const filterExprs = element ? getFiltersExprsFromExpression(element.expression) : [];
  const canvasFilters = useCanvasFilters(filterExprs);

  const filtersGroups = groupFiltersByField
    ? groupFiltersBy(canvasFilters, groupFiltersByField)
    : [];

  return (
    <Component
      filtersGroups={filtersGroups}
      onGroupByChange={onGroupByChange}
      groupFiltersByField={groupFiltersByField}
    />
  );
};
