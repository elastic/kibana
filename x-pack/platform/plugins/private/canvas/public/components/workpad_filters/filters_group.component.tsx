/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import React, { FC } from 'react';
import { FormattedFilterViewInstance } from '../../../types';
import { createFilledFilterView } from '../../lib/filter';
import { Filter } from './filter.component';
import { filterViews } from './filter_views';
import { FiltersGroup as FiltersGroupType } from './types';

interface Props {
  filtersGroup: FiltersGroupType;
  id: string | number;
}

const panelStyle = {
  paddingTop: '15px',
};

export const FiltersGroup: FC<Props> = ({ filtersGroup, id }) => {
  const { name, filters: groupFilters } = filtersGroup;

  const filledFilterViews: FormattedFilterViewInstance[] = groupFilters.map((filter) => {
    const filterView = filterViews[filter.type] ?? filterViews.default;
    return createFilledFilterView(filterView.view, filter);
  });

  const filtersComponents = filledFilterViews.map((filter, index) => (
    <Filter key={`filter-${name}-${index}`} filter={filter} />
  ));

  return (
    <div className="canvasSidebar__expandable">
      <EuiAccordion
        id={`canvas-filter-group-${id}`}
        buttonContent={name}
        initialIsOpen={true}
        className="canvasSidebar__accordion filtersSidebar__accordion"
        style={{ marginLeft: '0px' }}
      >
        <div style={panelStyle}>{filtersComponents}</div>
      </EuiAccordion>
    </div>
  );
};
