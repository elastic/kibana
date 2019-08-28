/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Temporary Workaround
 * This is not a well-designed container. It only exists to enable quick
 * migration of the redux-based logging ui into the infra-ui codebase. It will
 * be removed during the refactoring to graphql/apollo.
 */
import { connect } from 'react-redux';
import { bindPlainActionCreators } from '../../utils/typed_redux';

import {
  // searchActions,
  // searchResultsSelectors,
  // sharedSelectors,
  logPositionActions,
  State,
} from '../../store';

export const withLogSearchControlsProps = connect(
  (state: State) => ({
    // isLoadingSearchResults: searchResultsSelectors.selectIsLoadingSearchResults(state),
    // nextSearchResult: sharedSelectors.selectNextSearchResultKey(state),
    // previousSearchResult: sharedSelectors.selectPreviousSearchResultKey(state),
  }),
  bindPlainActionCreators({
    // clearSearch: searchActions.clearSearch,
    jumpToTarget: logPositionActions.jumpToTargetPosition,
    // search: searchActions.search,
  })
);
