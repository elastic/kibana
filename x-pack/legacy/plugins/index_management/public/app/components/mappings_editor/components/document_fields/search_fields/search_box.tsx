/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// The height of the Kibana Nav bar
const NAVBAR_HEIGHT = 48;

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
}

export const SearchBox = forwardRef(({ searchValue, onSearchChange }: Props, forwardedRef) => {
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [isSearchBoxSticky, setIsSearchBoxSticky] = useState(false);

  const handleScroll = () => {
    const isSticky = searchBoxRef.current!.getBoundingClientRect().top - NAVBAR_HEIGHT <= 0;
    setIsSearchBoxSticky(isSticky);
  };

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
      </div>
    </div>
  );
});
