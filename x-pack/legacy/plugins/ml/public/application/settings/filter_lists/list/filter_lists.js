/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React table for displaying a table of filter lists.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';

import { EuiPage, EuiPageContent } from '@elastic/eui';

import { injectI18n } from '@kbn/i18n/react';

import { toastNotifications } from 'ui/notify';

import { NavigationMenu } from '../../../components/navigation_menu';

import { FilterListsHeader } from './header';
import { FilterListsTable } from './table';
import { ml } from '../../../services/ml_api_service';

export const FilterLists = injectI18n(
  class extends Component {
    static displayName = 'FilterLists';
    static propTypes = {
      canCreateFilter: PropTypes.bool.isRequired,
      canDeleteFilter: PropTypes.bool.isRequired,
    };

    constructor(props) {
      super(props);

      this.state = {
        filterLists: [],
        selectedFilterLists: [],
      };
    }

    componentDidMount() {
      this.refreshFilterLists();
    }

    setFilterLists = filterLists => {
      // Check selected filter lists still exist.
      this.setState(prevState => {
        const loadedFilterIds = filterLists.map(filterList => filterList.filter_id);
        const selectedFilterLists = prevState.selectedFilterLists.filter(filterList => {
          return loadedFilterIds.indexOf(filterList.filter_id) !== -1;
        });

        return {
          filterLists,
          selectedFilterLists,
        };
      });
    };

    setSelectedFilterLists = selectedFilterLists => {
      this.setState({ selectedFilterLists });
    };

    refreshFilterLists = () => {
      const { intl } = this.props;
      // Load the list of filters.
      ml.filters
        .filtersStats()
        .then(filterLists => {
          this.setFilterLists(filterLists);
        })
        .catch(resp => {
          console.log('Error loading list of filters:', resp);
          toastNotifications.addDanger(
            intl.formatMessage({
              id: 'xpack.ml.settings.filterLists.filterLists.loadingFilterListsErrorMessage',
              defaultMessage: 'An error occurred loading the filter lists',
            })
          );
        });
    };

    render() {
      const { filterLists, selectedFilterLists } = this.state;
      const { canCreateFilter, canDeleteFilter } = this.props;

      return (
        <Fragment>
          <NavigationMenu tabId="settings" />
          <EuiPage className="ml-list-filter-lists">
            <EuiPageContent
              className="ml-list-filter-lists-content"
              verticalPosition="center"
              horizontalPosition="center"
            >
              <FilterListsHeader
                totalCount={filterLists.length}
                refreshFilterLists={this.refreshFilterLists}
              />
              <FilterListsTable
                canCreateFilter={canCreateFilter}
                canDeleteFilter={canDeleteFilter}
                filterLists={filterLists}
                selectedFilterLists={selectedFilterLists}
                setSelectedFilterLists={this.setSelectedFilterLists}
                refreshFilterLists={this.refreshFilterLists}
              />
            </EuiPageContent>
          </EuiPage>
        </Fragment>
      );
    }
  }
);
