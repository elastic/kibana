/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiOutsideClickDetector } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';

import {
  CATEGORY_PANE_WIDTH,
  FIELDS_PANE_WIDTH,
  getCategoryPaneCategoryClassName,
  getFieldBrowserCategoryTitleClassName,
  getFieldBrowserSearchInputClassName,
  PANES_FLEX_GROUP_WIDTH,
} from './helpers';
import { FieldBrowserProps, OnFieldSelected, OnHideFieldBrowser } from './types';
import { Header } from './header';
import { CategoriesPane } from './categories_pane';
import { FieldsPane } from './fields_pane';

const TOP_OFFSET = 207;

const FieldsBrowserContainer = styled.div<{
  top: number;
  width: number;
}>`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  border: 1px solid ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: 4px;
  padding: 8px 8px 16px 8px;
  position: absolute;
  ${({ top }) => `top: ${top}px`};
  ${({ width }) => `width: ${width}px`};
  z-index: 9990;
`;

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;

type Props = Pick<
  FieldBrowserProps,
  | 'browserFields'
  | 'height'
  | 'isLoading'
  | 'onFieldSelected'
  | 'onUpdateColumns'
  | 'timelineId'
  | 'width'
> & {
  /**
   * The current timeline column headers
   */
  columnHeaders: ColumnHeader[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * When true, a busy spinner will be shown to indicate the field browser
   * is searching for fields that match the specified `searchInput`
   */
  isSearching: boolean;
  /** The text displayed in the search input */
  searchInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryId: string;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  onCategorySelected: (categoryId: string) => void;
  /**
   * Hides the field browser when invoked
   */
  onHideFieldBrowser: OnHideFieldBrowser;
  /**
   * Invoked when the user clicks outside of the field browser
   */
  onOutsideClick: () => void;
  /**
   * Invoked when the user types in the search input
   */
  onSearchInputChange: (newSearchInput: string) => void;
  /**
   * Invoked to add or remove a column from the timeline
   */
  toggleColumn: (column: ColumnHeader) => void;
};

/**
 * This component has no internal state, but it uses lifecycle methods to
 * set focus to the search input, scroll to the selected category, etc
 */
export class FieldsBrowser extends React.PureComponent<Props> {
  public componentDidMount() {
    this.scrollViews();
    this.focusInput();
  }

  public componentDidUpdate() {
    this.scrollViews();
    this.focusInput(); // always re-focus the input to enable additional filtering
  }

  public render() {
    const {
      columnHeaders,
      browserFields,
      filteredBrowserFields,
      searchInput,
      isLoading,
      isSearching,
      onCategorySelected,
      onFieldSelected,
      onOutsideClick,
      onUpdateColumns,
      selectedCategoryId,
      timelineId,
      toggleColumn,
      width,
    } = this.props;

    return (
      <EuiOutsideClickDetector
        data-test-subj="outside-click-detector"
        onOutsideClick={onFieldSelected != null ? noop : onOutsideClick}
        isDisabled={false}
      >
        <FieldsBrowserContainer
          data-test-subj="fields-browser-container"
          top={TOP_OFFSET}
          width={width}
        >
          <Header
            filteredBrowserFields={filteredBrowserFields}
            isSearching={isSearching}
            onOutsideClick={onOutsideClick}
            onSearchInputChange={this.onInputChange}
            onUpdateColumns={onUpdateColumns}
            searchInput={searchInput}
            timelineId={timelineId}
          />

          <PanesFlexGroup alignItems="flexStart" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <CategoriesPane
                browserFields={browserFields}
                data-test-subj="left-categories-pane"
                filteredBrowserFields={filteredBrowserFields}
                width={CATEGORY_PANE_WIDTH}
                isLoading={isLoading}
                onCategorySelected={onCategorySelected}
                onUpdateColumns={onUpdateColumns}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <FieldsPane
                columnHeaders={columnHeaders}
                data-test-subj="fields-pane"
                filteredBrowserFields={filteredBrowserFields}
                isLoading={isLoading}
                onCategorySelected={onCategorySelected}
                onFieldSelected={this.selectFieldAndHide}
                onUpdateColumns={onUpdateColumns}
                searchInput={searchInput}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
                width={FIELDS_PANE_WIDTH}
              />
            </EuiFlexItem>
          </PanesFlexGroup>
        </FieldsBrowserContainer>
      </EuiOutsideClickDetector>
    );
  }

  /** Focuses the input that filters the field browser */
  private focusInput = () => {
    const elements = document.getElementsByClassName(
      getFieldBrowserSearchInputClassName(this.props.timelineId)
    );

    if (elements.length > 0) {
      (elements[0] as HTMLElement).focus(); // this cast is required because focus() does not exist on every `Element` returned by `getElementsByClassName`
    }
  };

  /** Invoked when the user types in the input to filter the field browser */
  private onInputChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onSearchInputChange(event.target.value);

  private selectFieldAndHide: OnFieldSelected = (fieldId: string) => {
    const { onFieldSelected, onHideFieldBrowser } = this.props;

    if (onFieldSelected != null) {
      onFieldSelected(fieldId);
    }

    onHideFieldBrowser();
  };

  private scrollViews = () => {
    const { selectedCategoryId, timelineId } = this.props;

    if (this.props.selectedCategoryId !== '') {
      const categoryPaneTitles = document.getElementsByClassName(
        getCategoryPaneCategoryClassName({
          categoryId: selectedCategoryId,
          timelineId,
        })
      );

      if (categoryPaneTitles.length > 0) {
        categoryPaneTitles[0].scrollIntoView();
      }

      const fieldPaneTitles = document.getElementsByClassName(
        getFieldBrowserCategoryTitleClassName({
          categoryId: selectedCategoryId,
          timelineId,
        })
      );

      if (fieldPaneTitles.length > 0) {
        fieldPaneTitles[0].scrollIntoView();
      }
    }

    this.focusInput(); // always re-focus the input to enable additional filtering
  };
}
