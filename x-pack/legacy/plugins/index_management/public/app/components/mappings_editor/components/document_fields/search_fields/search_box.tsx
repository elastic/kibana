/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { EuiFieldSearch, EuiButtonEmpty, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// The height of the Kibana Nav bar
const NAVBAR_HEIGHT = 48;
// The width of the left sidebar in tablet / desktop mode
const SIDEBAR_WIDTH = 264;
// The breakpoint under which the sidebar is not visible
const EUI_PADDING = 16;
// The max width of a page content.
const MAX_WIDTH_PAGE = 1200;

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
  goBackToSearchResult?: () => void;
}

export const SearchBox = forwardRef(
  ({ searchValue, onSearchChange, goBackToSearchResult }: Props, forwardedRef) => {
    const searchBoxRef = useRef<HTMLDivElement | null>(null);
    const [isSearchBoxSticky, setIsSearchBoxSticky] = useState(false);

    const handleScroll = () => {
      const isSticky =
        searchBoxRef.current!.getBoundingClientRect().top - NAVBAR_HEIGHT - EUI_PADDING <= 0;
      setIsSearchBoxSticky(isSticky);
    };

    const isBackToResultsButtonVisible = goBackToSearchResult !== undefined;

    let searchBoxStyle = {};

    if (isSearchBoxSticky) {
      const delta = window.innerWidth - (SIDEBAR_WIDTH + 2 * EUI_PADDING + MAX_WIDTH_PAGE);
      const offset = Math.abs(Math.max(0, delta));

      searchBoxStyle = {
        left: 'auto',
        // When we display the "Back to search results" button, we can reduce the padding bottom
        paddingBottom: isBackToResultsButtonVisible ? `${EUI_PADDING * 0.5}px` : undefined,
        // We add 1 pixel to not overlap the page right border
        right: `${EUI_PADDING + 1 + offset * 0.5}px`,
        width: `${351 + 2.5 * EUI_PADDING}px`,
      };
    }

    useEffect(() => {
      window.addEventListener('scroll', handleScroll);

      return () => {
        window.removeEventListener('scroll', () => handleScroll);
      };
    }, []);

    useEffect(() => {
      if (!forwardedRef) {
        return;
      }
      if (typeof forwardedRef === 'function') {
        forwardedRef(searchBoxRef.current);
      } else {
        // @ts-ignore
        // by default forwardedRef.current is readonly. Let's ignore it
        forwardedRef.current = searchBoxRef.current;
      }
    }, []);

    return (
      <div ref={searchBoxRef} className="mappingsEditor__documentFields__searchBox">
        <div
          className={classNames('mappingsEditor__documentFields__searchBox__inner', {
            'mappingsEditor__documentFields__searchBox__inner--is-sticky': isSearchBoxSticky,
          })}
          style={searchBoxStyle}
        >
          <EuiFieldSearch
            style={{ minWidth: '350px' }}
            placeholder={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsPlaceholder',
              {
                defaultMessage: 'Search fields',
              }
            )}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            aria-label={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsAriaLabel',
              {
                defaultMessage: 'Search mapped fields',
              }
            )}
          />
          {isBackToResultsButtonVisible && (
            <EuiFlexItem style={{ alignItems: 'flex-start' }}>
              <EuiSpacer size="s" />
              <EuiButtonEmpty size="xs" onClick={goBackToSearchResult}>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.goBackToSearchButtonLabel', {
                  defaultMessage: 'Back to search results',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </div>
      </div>
    );
  }
);
