/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setFilters } from '../../../state/actions';
import { FilterGroup as FilterGroupComponent } from './filter_group';

const mapDispatchToProps = (dispatch: any) => ({
  setFilters: (filters: Map<string, string[]>) => dispatch(setFilters(filters)),
});

export const FilterGroup = connect(null, mapDispatchToProps)(FilterGroupComponent);
