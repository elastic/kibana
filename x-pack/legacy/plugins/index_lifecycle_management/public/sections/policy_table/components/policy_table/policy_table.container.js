/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { PolicyTable as PresentationComponent } from './policy_table';
import {
  fetchPolicies,
  policyFilterChanged,
  policyPageChanged,
  policyPageSizeChanged,
  policySortChanged,
} from '../../../../store/actions';
import {
  getPolicies,
  getPageOfPolicies,
  getPolicyPager,
  getPolicyFilter,
  getPolicySort,
  isPolicyListLoaded,
} from '../../../../store/selectors';

const mapDispatchToProps = dispatch => {
  return {
    policyFilterChanged: filter => {
      dispatch(policyFilterChanged({ filter }));
    },
    policyPageChanged: pageNumber => {
      dispatch(policyPageChanged({ pageNumber }));
    },
    policyPageSizeChanged: pageSize => {
      dispatch(policyPageSizeChanged({ pageSize }));
    },
    policySortChanged: (sortField, isSortAscending) => {
      dispatch(policySortChanged({ sortField, isSortAscending }));
    },
    fetchPolicies: withIndices => {
      dispatch(fetchPolicies(withIndices));
    },
  };
};

export const PolicyTable = connect(
  state => ({
    totalNumberOfPolicies: getPolicies(state).length,
    policies: getPageOfPolicies(state),
    pager: getPolicyPager(state),
    filter: getPolicyFilter(state),
    sortField: getPolicySort(state).sortField,
    isSortAscending: getPolicySort(state).isSortAscending,
    policyListLoaded: isPolicyListLoaded(state),
  }),
  mapDispatchToProps
)(PresentationComponent);
