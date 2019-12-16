/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiOutsideClickDetector } from '@elastic/eui';
import React, { useEffect, useCallback } from 'react';
import { noop } from 'lodash/fp';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { CategoriesPane } from './categories_pane';
import { FieldsPane } from './fields_pane';
import { Header } from './header';
import {
  CATEGORY_PANE_WIDTH,
  FIELDS_PANE_WIDTH,
  getCategoryPaneCategoryClassName,
  getFieldBrowserCategoryTitleClassName,
  getFieldBrowserSearchInputClassName,
  PANES_FLEX_GROUP_WIDTH,
} from './helpers';
import { FieldBrowserProps, OnHideFieldBrowser } from './types';

const FieldsBrowserContainer = styled.div<{ width: number }>`
  background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  border: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  left: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.s} ${({ theme }) => theme.eui.paddingSizes.s}
    ${({ theme }) => theme.eui.paddingSizes.m};
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.eui.euiSize});
  width: ${({ width }) => width}px;
  z-index: 9990;
`;
FieldsBrowserContainer.displayName = 'FieldsBrowserContainer';

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;
PanesFlexGroup.displayName = 'PanesFlexGroup';

type Props = Pick<
  FieldBrowserProps,
  | 'browserFields'
  | 'isEventViewer'
  | 'height'
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
export const FieldsBrowser = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    filteredBrowserFields,
    isEventViewer,
    isSearching,
    onCategorySelected,
    onFieldSelected,
    onHideFieldBrowser,
    onSearchInputChange,
    onOutsideClick,
    onUpdateColumns,
    searchInput,
    selectedCategoryId,
    timelineId,
    toggleColumn,
    width,
  }) => {
    /** Focuses the input that filters the field browser */
    const focusInput = () => {
      const elements = document.getElementsByClassName(
        getFieldBrowserSearchInputClassName(timelineId)
      );

      if (elements.length > 0) {
        (elements[0] as HTMLElement).focus(); // this cast is required because focus() does not exist on every `Element` returned by `getElementsByClassName`
      }
    };

    /** Invoked when the user types in the input to filter the field browser */
    const onInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchInputChange(event.target.value);
      },
      [onSearchInputChange]
    );

    const selectFieldAndHide = useCallback(
      (fieldId: string) => {
        if (onFieldSelected != null) {
          onFieldSelected(fieldId);
        }

        onHideFieldBrowser();
      },
      [onFieldSelected, onHideFieldBrowser]
    );

    const scrollViews = () => {
      if (selectedCategoryId !== '') {
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

      focusInput(); // always re-focus the input to enable additional filtering
    };

    useEffect(() => {
      scrollViews();
    }, [selectedCategoryId, timelineId]);

    return (
      <EuiOutsideClickDetector
        data-test-subj="outside-click-detector"
        onOutsideClick={onFieldSelected != null ? noop : onOutsideClick}
        isDisabled={false}
      >
        <FieldsBrowserContainer data-test-subj="fields-browser-container" width={width}>
          <Header
            data-test-subj="header"
            filteredBrowserFields={filteredBrowserFields}
            isEventViewer={isEventViewer}
            isSearching={isSearching}
            onOutsideClick={onOutsideClick}
            onSearchInputChange={onInputChange}
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
                onCategorySelected={onCategorySelected}
                onFieldSelected={selectFieldAndHide}
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
);

FieldsBrowser.displayName = 'FieldsBrowser';
