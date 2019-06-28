/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { connect } from 'react-redux';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DEFAULT_CATEGORY_NAME } from '../timeline/body/column_headers/default_headers';
import { OnUpdateColumns } from '../timeline/events';

import { FieldsBrowser } from './field_browser';
import { FieldBrowserProps } from './types';
import { filterBrowserFieldsByFieldName, mergeBrowserFieldsWithDefaultCategory } from './helpers';

import * as i18n from './translations';
import { timelineActions } from '../../store/actions';

/** wait this many ms after the user completes typing before applying the filter input */
const INPUT_TIMEOUT = 250;

interface State {
  /** all field names shown in the field browser must contain this string (when specified) */
  filterInput: string;
  /** all fields in this collection have field names that match the filterInput */
  filteredBrowserFields: BrowserFields | null;
  /** when true, show a spinner in the input to indicate the field browser is searching for matching field names */
  isSearching: boolean;
  /** this category will be displayed in the right-hand pane of the field browser */
  selectedCategoryId: string;
  /** show the field browser */
  show: boolean;
}

const FieldsBrowserButtonContainer = styled.div`
  button {
    border-color: ${({ theme }) => theme.eui.euiColorLightShade};
    color: ${({ theme }) => theme.eui.euiColorDarkestShade};
    font-size: 14px;
    margin: 1px 5px 2px 0;
  }
`;

interface DispatchProps {
  removeColumn?: ActionCreator<{
    id: string;
    columnId: string;
  }>;
  upsertColumn?: ActionCreator<{
    column: ColumnHeader;
    id: string;
    index: number;
  }>;
}

/**
 * Manages the state of the field browser
 */
export class StatefulFieldsBrowserComponent extends React.PureComponent<
  FieldBrowserProps & DispatchProps,
  State
> {
  /** tracks the latest timeout id from `setTimeout`*/
  private inputTimeoutId: number = 0;

  constructor(props: FieldBrowserProps) {
    super(props);

    this.state = {
      filterInput: '',
      filteredBrowserFields: null,
      isSearching: false,
      selectedCategoryId: DEFAULT_CATEGORY_NAME,
      show: false,
    };
  }

  public componentWillUnmount() {
    if (this.inputTimeoutId !== 0) {
      // ⚠️ mutation: cancel any remaining timers and zero-out the timer id:
      clearTimeout(this.inputTimeoutId);
      this.inputTimeoutId = 0;
    }
  }

  public render() {
    const {
      columnHeaders,
      browserFields,
      height,
      isLoading,
      onFieldSelected,
      timelineId,
      width,
    } = this.props;
    const {
      filterInput,
      filteredBrowserFields,
      isSearching,
      selectedCategoryId,
      show,
    } = this.state;

    // only merge in the default category if the field browser is visible
    const browserFieldsWithDefaultCategory = show
      ? mergeBrowserFieldsWithDefaultCategory(browserFields)
      : {};

    return (
      <>
        <FieldsBrowserButtonContainer>
          <EuiToolTip content={i18n.CUSTOMIZE_COLUMNS}>
            <EuiButton
              color="primary"
              data-test-subj="show-field-browser"
              iconSide="right"
              iconType="arrowDown"
              onClick={this.toggleShow}
              size="s"
            >
              {i18n.FIELDS}
            </EuiButton>
          </EuiToolTip>
        </FieldsBrowserButtonContainer>

        {show && (
          <FieldsBrowser
            columnHeaders={columnHeaders}
            browserFields={browserFieldsWithDefaultCategory}
            filteredBrowserFields={
              filteredBrowserFields != null
                ? filteredBrowserFields
                : browserFieldsWithDefaultCategory
            }
            searchInput={filterInput}
            height={height}
            isLoading={isLoading}
            isSearching={isSearching}
            onCategorySelected={this.updateSelectedCategoryId}
            onFieldSelected={onFieldSelected}
            onHideFieldBrowser={this.hideFieldBrowser}
            onOutsideClick={show ? this.hideFieldBrowser : noop}
            onUpdateColumns={this.updateColumnsAndSelectCategoryId}
            onSearchInputChange={this.updateFilter}
            selectedCategoryId={selectedCategoryId}
            timelineId={timelineId}
            toggleColumn={this.toggleColumn}
            width={width}
          />
        )}
      </>
    );
  }

  /** Shows / hides the field browser */
  private toggleShow = () => {
    this.setState(({ show }) => ({
      show: !show,
    }));
  };

  private toggleColumn = (column: ColumnHeader) => {
    const { columnHeaders, removeColumn, timelineId, upsertColumn } = this.props;
    const exists = columnHeaders.findIndex(c => c.id === column.id) !== -1;

    if (!exists && upsertColumn != null) {
      upsertColumn({
        column,
        id: timelineId,
        index: 1,
      });
    }

    if (exists && removeColumn != null) {
      removeColumn({
        columnId: column.id,
        id: timelineId,
      });
    }
  };

  /** Invoked when the user types in the filter input */
  private updateFilter = (filterInput: string): void => {
    this.setState({
      filterInput,
      isSearching: true,
    });

    if (this.inputTimeoutId !== 0) {
      clearTimeout(this.inputTimeoutId); // ⚠️ mutation: cancel any previous timers
    }

    // ⚠️ mutation: schedule a new timer that will apply the filter when it fires:
    this.inputTimeoutId = window.setTimeout(() => {
      const filteredBrowserFields = filterBrowserFieldsByFieldName({
        browserFields: mergeBrowserFieldsWithDefaultCategory(this.props.browserFields),
        substring: this.state.filterInput,
      });

      this.setState(currentState => ({
        filteredBrowserFields,
        isSearching: false,
        selectedCategoryId:
          currentState.filterInput === '' || Object.keys(filteredBrowserFields).length === 0
            ? DEFAULT_CATEGORY_NAME
            : Object.keys(filteredBrowserFields)
                .sort()
                .reduce<string>(
                  (selected, category) =>
                    filteredBrowserFields[category].fields != null &&
                    filteredBrowserFields[selected].fields != null &&
                    filteredBrowserFields[category].fields!.length >
                      filteredBrowserFields[selected].fields!.length
                      ? category
                      : selected,
                  Object.keys(filteredBrowserFields)[0]
                ),
      }));
    }, INPUT_TIMEOUT);
  };

  /**
   * Invoked when the user clicks a category name in the left-hand side of
   * the field browser
   */
  private updateSelectedCategoryId = (categoryId: string): void => {
    this.setState({
      selectedCategoryId: categoryId,
    });
  };

  /**
   * Invoked when the user clicks on the context menu to view a category's
   * columns in the timeline, this function dispatches the action that
   * causes the timeline display those columns.
   */
  private updateColumnsAndSelectCategoryId: OnUpdateColumns = (columns: ColumnHeader[]): void => {
    this.props.onUpdateColumns(columns); // show the category columns in the timeline
  };

  /** Invoked when the field browser should be hidden */
  private hideFieldBrowser = () => {
    this.setState({
      filterInput: '',
      filteredBrowserFields: null,
      isSearching: false,
      selectedCategoryId: DEFAULT_CATEGORY_NAME,
      show: false,
    });
  };
}

export const StatefulFieldsBrowser = connect(
  null,
  {
    removeColumn: timelineActions.removeColumn,
    upsertColumn: timelineActions.upsertColumn,
  }
)(StatefulFieldsBrowserComponent);
