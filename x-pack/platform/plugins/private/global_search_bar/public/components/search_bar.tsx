/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFormLabel,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiSelectableTemplateSitewide,
  euiSelectableTemplateSitewideRenderOptions,
  useEuiTheme,
  useEuiBreakpoint,
  mathWithUnits,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import useObservable from 'react-use/lib/useObservable';
import { isMac } from '@kbn/shared-ux-utility';
import { i18nStrings } from '../strings';
import { SearchFooter } from './search_footer';
import { SearchPlaceholder } from './search_placeholder';
import { useSearchState } from '../hooks/use_search_state';
import { EmptyMessage } from './empty_message';
import { CharLimitExceededMessage } from './char_limit_exceeded_message';
import { blurEvent } from '.';
import type { SearchBarProps } from './types';

export const SearchBar = ({
  globalSearch,
  taggingApi,
  navigateToUrl,
  reportEvent,
  chromeStyle$,
  basePathUrl,
}: SearchBarProps) => {
  const { euiTheme } = useEuiTheme();
  const chromeStyle = useObservable(chromeStyle$);

  // These hooks are used when on chromeStyle set to 'project'
  const [isVisible, setIsVisible] = useState(false);
  const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);

  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);
  const [showAppend, setShowAppend] = useState<boolean>(true);

  const {
    searchValue,
    setSearchValue,
    options,
    isLoading,
    searchCharLimitExceeded,
    onChange,
    setSearchRef,
    searchRef,
    triggerInitialLoad,
  } = useSearchState({
    globalSearch,
    taggingApi,
    navigateToUrl,
    reportEvent,
    onResultSelect: () => {
      (document.activeElement as HTMLElement).blur();
      if (searchRef.current) {
        setSearchValue('');
        searchRef.current.dispatchEvent(blurEvent);
      }
    },
  });

  const styles = css({
    [useEuiBreakpoint(['m', 'l'])]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 10),
    },
    [useEuiMinBreakpoint('xl')]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 15),
    },
  });

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        reportEvent.shortcutUsed();
        if (chromeStyle === 'project' && !isVisible) {
          visibilityButtonRef.current?.click();
        } else if (searchRef.current) {
          searchRef.current.focus();
        } else if (buttonRef) {
          (buttonRef.children[0] as HTMLButtonElement).click();
        }
      }
    },
    [chromeStyle, isVisible, buttonRef, searchRef, reportEvent]
  );

  const keyboardShortcutTooltip = `${i18nStrings.keyboardShortcutTooltip.prefix}: ${
    isMac ? i18nStrings.keyboardShortcutTooltip.onMac : i18nStrings.keyboardShortcutTooltip.onNotMac
  }`;

  useEvent('keydown', onKeyDown);

  if (chromeStyle === 'project' && !isVisible) {
    return (
      <EuiHeaderSectionItemButton
        aria-label={i18nStrings.showSearchAriaText}
        buttonRef={visibilityButtonRef}
        color="text"
        data-test-subj="nav-search-reveal"
        onClick={() => {
          setIsVisible(true);
        }}
      >
        <EuiIcon type="magnify" size="m" aria-hidden={true} />
      </EuiHeaderSectionItemButton>
    );
  }

  const getAppendForChromeStyle = () => {
    if (chromeStyle === 'project') {
      return (
        <EuiButtonIcon
          aria-label={i18nStrings.closeSearchAriaText}
          color="text"
          data-test-subj="nav-search-conceal"
          iconType="cross"
          onClick={() => {
            reportEvent.searchBlur();
            setIsVisible(false);
          }}
        />
      );
    }

    if (showAppend) {
      return (
        <EuiFormLabel
          title={keyboardShortcutTooltip}
          css={{ fontFamily: euiTheme.font.familyCode }}
        >
          {isMac ? '⌘/' : '^/'}
        </EuiFormLabel>
      );
    }
  };

  return (
    <EuiSelectableTemplateSitewide
      isLoading={isLoading}
      isPreFiltered
      onChange={onChange}
      options={options}
      css={styles}
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchValue)}
      colorModes={chromeStyle !== 'project' ? { search: 'dark', popover: 'global' } : undefined}
      listProps={{
        className: 'eui-yScroll',
        css: css`
          max-block-size: 75vh;
        `,
      }}
      searchProps={{
        autoFocus: chromeStyle === 'project',
        value: searchValue,
        onInput: (e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value),
        'data-test-subj': 'nav-search-input',
        inputRef: setSearchRef,
        compressed: true,
        'aria-label': i18nStrings.placeholderText,
        placeholder: i18nStrings.placeholderText,
        onFocus: () => {
          reportEvent.searchFocus();
          triggerInitialLoad();
          setShowAppend(false);
        },
        onBlur: () => {
          reportEvent.searchBlur();
          setShowAppend(!searchValue.length);
        },
        fullWidth: true,
        append: getAppendForChromeStyle(),
      }}
      errorMessage={
        searchCharLimitExceeded ? <CharLimitExceededMessage basePathUrl={basePathUrl} /> : null
      }
      emptyMessage={<EmptyMessage />}
      noMatchesMessage={<SearchPlaceholder basePath={basePathUrl} />}
      popoverProps={{
        zIndex: Number(euiTheme.levels.navigation),
        'data-test-subj': 'nav-search-popover',
        panelClassName: 'navSearch__panel',
        repositionOnScroll: true,
        popoverRef: setButtonRef,
        panelStyle: { marginTop: '6px' },
      }}
      popoverButton={
        <EuiHeaderSectionItemButton aria-label={i18nStrings.popoverButton}>
          <EuiIcon type="magnify" size="m" aria-hidden={true} />
        </EuiHeaderSectionItemButton>
      }
      popoverFooter={<SearchFooter />}
    />
  );
};
