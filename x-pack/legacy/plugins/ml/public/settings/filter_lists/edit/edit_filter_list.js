/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for viewing and editing a filter list, a list of items
 * used for example to safe list items via a job detector rule.
 */

import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContent,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { toastNotifications } from 'ui/notify';

import { EditFilterListHeader } from './header';
import { EditFilterListToolbar } from './toolbar';
import { ItemsGrid } from '../../../components/items_grid';
import { NavigationMenu } from '../../../components/navigation_menu';
import {
  isValidFilterListId,
  saveFilterList
} from './utils';
import { ml } from '../../../services/ml_api_service';

const DEFAULT_ITEMS_PER_PAGE = 50;

// Returns the list of items that match the query entered in the EuiSearchBar.
function getMatchingFilterItems(searchBarQuery, items) {
  if (items === undefined) {
    return [];
  }

  if (searchBarQuery === undefined) {
    return [...items];
  }

  // Convert the list of Strings into a list of Objects suitable for running through
  // the search bar query.
  const allItems = items.map(item => ({ value: item }));
  const matchingObjects =
    EuiSearchBar.Query.execute(searchBarQuery, allItems, { defaultFields: ['value'] });
  return matchingObjects.map(item => item.value);
}

function getActivePage(activePageState, itemsPerPage, numMatchingItems) {
  // Checks if supplied active page number from state is applicable for the number
  // of matching items in the grid, and if not returns the last applicable page number.
  let activePage = activePageState;
  const activePageStartIndex = itemsPerPage * activePageState;
  if (activePageStartIndex > numMatchingItems) {
    activePage = Math.max((Math.ceil(numMatchingItems / itemsPerPage)) - 1, 0); // Sets to 0 for 0 matches.
  }
  return activePage;
}

function returnToFiltersList() {
  window.location.href = `#/settings/filter_lists`;
}

export const EditFilterList = injectI18n(class extends Component {
  static displayName = 'EditFilterList';
  static propTypes = {
    filterId: PropTypes.string,
    canCreateFilter: PropTypes.bool.isRequired,
    canDeleteFilter: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      description: '',
      items: [],
      matchingItems: [],
      selectedItems: [],
      loadedFilter: {},
      newFilterId: '',
      isNewFilterIdInvalid: true,
      activePage: 0,
      itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
      saveInProgress: false,
    };
  }

  componentDidMount() {
    const filterId = this.props.filterId;
    if (filterId !== undefined) {
      this.loadFilterList(filterId);
    } else {
      this.setState({ newFilterId: '' });
    }
  }

  loadFilterList = (filterId) => {
    const { intl } = this.props;

    ml.filters.filters({ filterId })
      .then((filter) => {
        this.setLoadedFilterState(filter);
      })
      .catch((resp) => {
        console.log(`Error loading filter ${filterId}:`, resp);
        toastNotifications.addDanger(intl.formatMessage({
          id: 'xpack.ml.settings.filterLists.editFilterList.loadingDetailsOfFilterErrorMessage',
          defaultMessage: 'An error occurred loading details of filter {filterId}',
        }, {
          filterId,
        }));
      });
  }

  setLoadedFilterState = (loadedFilter) => {
    // Store the loaded filter so we can diff changes to the items when saving updates.
    this.setState((prevState) => {
      const { itemsPerPage, searchQuery } = prevState;

      const matchingItems = getMatchingFilterItems(searchQuery, loadedFilter.items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        description: loadedFilter.description,
        items: (loadedFilter.items !== undefined) ? [...loadedFilter.items] : [],
        matchingItems,
        selectedItems: [],
        loadedFilter,
        isNewFilterIdInvalid: false,
        activePage,
        searchQuery,
        saveInProgress: false
      };
    });
  }

  updateNewFilterId = (newFilterId) => {
    this.setState({
      newFilterId,
      isNewFilterIdInvalid: !isValidFilterListId(newFilterId)
    });
  }

  updateDescription = (description) => {
    this.setState({ description });
  }

  addItems = (itemsToAdd) => {
    const { intl } = this.props;

    this.setState((prevState) => {
      const { itemsPerPage, searchQuery } = prevState;
      const items = [...prevState.items];
      const alreadyInFilter = [];
      itemsToAdd.forEach((item) => {
        if (items.indexOf(item) === -1) {
          items.push(item);
        } else {
          alreadyInFilter.push(item);
        }
      });
      items.sort((str1, str2) => {
        return str1.localeCompare(str2);
      });

      if (alreadyInFilter.length > 0) {
        toastNotifications.addWarning(intl.formatMessage({
          id: 'xpack.ml.settings.filterLists.editFilterList.duplicatedItemsInFilterListWarningMessage',
          defaultMessage: 'The following items were already in the filter list: {alreadyInFilter}',
        }, {
          alreadyInFilter,
        }));
      }

      const matchingItems = getMatchingFilterItems(searchQuery, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        items,
        matchingItems,
        activePage,
        searchQuery
      };
    });
  };

  deleteSelectedItems = () => {
    this.setState((prevState) => {
      const { selectedItems, itemsPerPage, searchQuery } = prevState;
      const items = [...prevState.items];
      selectedItems.forEach((item) => {
        const index = items.indexOf(item);
        if (index !== -1) {
          items.splice(index, 1);
        }
      });

      const matchingItems = getMatchingFilterItems(searchQuery, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        items,
        matchingItems,
        selectedItems: [],
        activePage,
        searchQuery
      };
    });
  }

  onSearchChange = ({ query }) => {
    this.setState((prevState) => {
      const { items, itemsPerPage } = prevState;

      const matchingItems = getMatchingFilterItems(query, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        matchingItems,
        activePage,
        searchQuery: query
      };
    });
  };

  setItemSelected = (item, isSelected) => {
    this.setState((prevState) => {
      const selectedItems = [...prevState.selectedItems];
      const index = selectedItems.indexOf(item);
      if (isSelected === true && index === -1) {
        selectedItems.push(item);
      } else if (isSelected === false && index !== -1) {
        selectedItems.splice(index, 1);
      }

      return {
        selectedItems
      };
    });
  };

  setActivePage = (activePage) => {
    this.setState({ activePage });
  }

  setItemsPerPage = (itemsPerPage) => {
    this.setState({
      itemsPerPage,
      activePage: 0
    });
  }

  save = () => {
    this.setState({ saveInProgress: true });

    const { loadedFilter, newFilterId, description, items } = this.state;
    const { intl } = this.props;
    const filterId = (this.props.filterId !== undefined) ? this.props.filterId : newFilterId;
    saveFilterList(
      filterId,
      description,
      items,
      loadedFilter
    )
      .then((savedFilter) => {
        this.setLoadedFilterState(savedFilter);
        returnToFiltersList();
      })
      .catch((resp) => {
        console.log(`Error saving filter ${filterId}:`, resp);
        toastNotifications.addDanger(intl.formatMessage({
          id: 'xpack.ml.settings.filterLists.editFilterList.savingFilterErrorMessage',
          defaultMessage: 'An error occurred saving filter {filterId}',
        }, {
          filterId,
        }));
        this.setState({ saveInProgress: false });
      });
  }

  render() {
    const {
      loadedFilter,
      newFilterId,
      isNewFilterIdInvalid,
      description,
      items,
      matchingItems,
      selectedItems,
      itemsPerPage,
      activePage,
      saveInProgress } = this.state;
    const { canCreateFilter, canDeleteFilter } = this.props;

    const totalItemCount = (items !== undefined) ? items.length : 0;

    return (
      <Fragment>
        <NavigationMenu tabId="settings" />
        <EuiPage className="ml-edit-filter-lists">
          <EuiPageContent
            className="ml-edit-filter-lists-content"
            verticalPosition="center"
            horizontalPosition="center"
          >
            <EditFilterListHeader
              canCreateFilter={canCreateFilter}
              filterId={this.props.filterId}
              newFilterId={newFilterId}
              isNewFilterIdInvalid={isNewFilterIdInvalid}
              updateNewFilterId={this.updateNewFilterId}
              description={description}
              updateDescription={this.updateDescription}
              totalItemCount={totalItemCount}
              usedBy={loadedFilter.used_by}
            />
            <EditFilterListToolbar
              canCreateFilter={canCreateFilter}
              canDeleteFilter={canDeleteFilter}
              onSearchChange={this.onSearchChange}
              addItems={this.addItems}
              deleteSelectedItems={this.deleteSelectedItems}
              selectedItemCount={selectedItems.length}
            />
            <EuiSpacer size="xl" />
            <ItemsGrid
              totalItemCount={totalItemCount}
              items={matchingItems}
              selectedItems={selectedItems}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={this.setItemsPerPage}
              setItemSelected={this.setItemSelected}
              activePage={activePage}
              setActivePage={this.setActivePage}
            />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={returnToFiltersList}
                >
                  <FormattedMessage
                    id="xpack.ml.settings.filterLists.editFilterList.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={this.save}
                  disabled={(saveInProgress === true) ||
                  (isNewFilterIdInvalid === true) ||
                  (canCreateFilter === false)
                  }
                  fill
                >
                  <FormattedMessage
                    id="xpack.ml.settings.filterLists.editFilterList.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContent>
        </EuiPage>
      </Fragment>
    );
  }
});
