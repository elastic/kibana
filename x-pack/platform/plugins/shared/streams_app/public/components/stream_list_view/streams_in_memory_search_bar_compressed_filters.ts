/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import type { EuiThemeComputed } from '@elastic/eui';

/**
 * {@link EuiSearchBar} uses a compressed {@link EuiFieldSearch} in the search holder while
 * filters render in an uncompressed {@link EuiFilterGroup}. Unified {@link StreamsAppSearchBar}
 * adds a SuperDatePicker and buttons in `toolsRight`. Normalize all of them to the same
 * EUI compressed form control block size ({@link EuiThemeComputed} `size.xl`, see EUI
 * `euiFormVariables.controlCompressedHeight` in form.styles).
 *
 * @see https://eui.elastic.co/docs/components/forms/search-and-filter/search-bar/
 */
export const streamsInMemorySearchBarCompressedFiltersCss = (euiTheme: EuiThemeComputed) => {
  const rowHeight = euiTheme.size.xl;
  return css`
    && .euiSearchBar__searchHolder .euiFormControlLayout,
    && .euiSearchBar__searchHolder .kbnQueryBar .euiFormControlLayout {
      block-size: ${rowHeight} !important;
      min-block-size: 0 !important;
      max-block-size: ${rowHeight} !important;
    }

    && .euiSearchBar__filtersHolder .euiFilterButton__wrapper,
    && .euiSearchBar__filtersHolder .euiFilterButton:not(.euiFilterButton-isToggle),
    && .euiSearchBar__filtersHolder .euiPopover .euiFilterButton:not(.euiFilterButton-isToggle) {
      min-block-size: 0 !important;
      block-size: ${rowHeight} !important;
    }

    &&
      .euiFlexGroup:has(.euiSearchBar__searchHolder)
      > .euiFlexItem:last-of-type
      .euiFormControlLayout {
      block-size: ${rowHeight} !important;
      min-block-size: 0 !important;
      max-block-size: ${rowHeight} !important;
    }

    &&
      .euiFlexGroup:has(.euiSearchBar__searchHolder)
      > .euiFlexItem:last-of-type
      .uniSearchBar
      .euiSuperDatePicker
      button,
    &&
      .euiFlexGroup:has(.euiSearchBar__searchHolder)
      > .euiFlexItem:last-of-type
      .uniSearchBar
      button.euiButton,
    &&
      .euiFlexGroup:has(.euiSearchBar__searchHolder)
      > .euiFlexItem:last-of-type
      .uniSearchBar
      button.euiButtonIcon {
      block-size: ${rowHeight} !important;
      min-block-size: 0 !important;
      max-block-size: ${rowHeight} !important;
    }
  `;
};
