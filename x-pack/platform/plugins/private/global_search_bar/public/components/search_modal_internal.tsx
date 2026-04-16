/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiIcon,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiSelectable,
  euiSelectableTemplateSitewideRenderOptions,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect } from 'react';
import { i18nStrings } from '../strings';
import { SearchFooter } from './search_footer';
import { SearchPlaceholder } from './search_placeholder';
import { useSearchState } from '../hooks/use_search_state';
import type { SearchModalProps } from './types';
import { EmptyMessage } from './empty_message';
import {
  SEARCH_MODAL_KEYBOARD_SHORTCUT,
  SEARCH_MODAL_ROW_HEIGHT,
  SEARCH_MODAL_SELECTOR_PREFIX,
} from './types';
import { CharLimitExceededMessage } from './char_limit_exceeded_message';

export const SearchModalInternal = ({
  globalSearch,
  taggingApi,
  navigateToUrl,
  reportEvent,
  basePathUrl,
  onClose,
}: SearchModalProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    searchValue,
    setSearchValue,
    options,
    isLoading,
    searchCharLimitExceeded,
    onChange,
    setSearchRef,
    triggerInitialLoad,
  } = useSearchState({
    globalSearch,
    taggingApi,
    navigateToUrl,
    reportEvent,
    onResultSelect: onClose,
  });

  useEffect(() => {
    triggerInitialLoad();
    reportEvent.searchFocus();
    return () => {
      reportEvent.searchBlur();
    };
  }, [triggerInitialLoad, reportEvent]);

  const formattedOptions = options.map((option) => ({
    ...option,
    prepend: option.icon ? <EuiIcon color="subdued" size="l" {...option.icon} /> : option.prepend,
  }));

  const selectableStyles = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    overflow: hidden;
  `;

  const headerStyles = css`
    padding-block: ${euiTheme.size.base};
    padding-inline: ${euiTheme.size.base};
  `;

  const bodyStyles = css`
    .euiModalBody__overflow {
      padding-inline: 0;
      padding-block: 0;
      display: flex;
      flex-direction: column;
      justify-content: ${isLoading || options.length === 0 ? 'center' : 'flex-start'};
    }
  `;

  const footerStyles = css`
    padding-block: ${euiTheme.size.s};
    padding-inline: ${euiTheme.size.base};
  `;

  return (
    <EuiSelectable
      css={selectableStyles}
      isLoading={isLoading}
      isPreFiltered
      onChange={onChange}
      options={formattedOptions}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchValue)}
      listProps={{
        rowHeight: SEARCH_MODAL_ROW_HEIGHT,
        showIcons: false,
      }}
      searchProps={{
        autoFocus: true,
        value: searchValue,
        onInput: (e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value),
        'data-test-subj': `${SEARCH_MODAL_SELECTOR_PREFIX}Input`,
        inputRef: setSearchRef,
        compressed: false,
        'aria-label': i18nStrings.placeholderText,
        placeholder: i18nStrings.placeholderText,
        fullWidth: true,
        isClearable: true,
      }}
      noMatchesMessage={
        searchCharLimitExceeded ? undefined : <SearchPlaceholder basePath={basePathUrl} />
      }
      searchable
      emptyMessage={<EmptyMessage />}
    >
      {(list, search) => (
        <>
          <EuiModalHeader css={headerStyles}>{search}</EuiModalHeader>
          <EuiHorizontalRule margin="none" />
          <EuiModalBody css={bodyStyles}>
            {searchCharLimitExceeded ? (
              <CharLimitExceededMessage basePathUrl={basePathUrl} />
            ) : (
              list
            )}
          </EuiModalBody>
          <EuiHorizontalRule margin="none" />
          <EuiModalFooter css={footerStyles}>
            <SearchFooter shortcutKey={SEARCH_MODAL_KEYBOARD_SHORTCUT.toUpperCase()} />
          </EuiModalFooter>
        </>
      )}
    </EuiSelectable>
  );
};
