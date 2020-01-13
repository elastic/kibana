/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../services/documentation';

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
}

// The height of the Kibana Nav bar
const NAVBAR_HEIGHT = 48;

export const DocumentFieldsHeader = React.memo(({ searchValue, onSearchChange }: Props) => {
  const searchBox = useRef<HTMLDivElement | null>(null);
  // We initially hardcode the height, but we will update it with the DOM value
  const [searchBoxHeight, setSearchBoxHeight] = useState(40);
  const [isSearchBoxSticky, setIsSearchBoxSticky] = useState(false);

  const handleScroll = () => {
    const isSticky = searchBox.current!.getBoundingClientRect().top - NAVBAR_HEIGHT <= 0;
    setIsSearchBoxSticky(isSticky);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', () => handleScroll);
    };
  }, []);

  useEffect(() => {
    if (searchBox.current !== null) {
      setSearchBoxHeight(searchBox.current.getBoundingClientRect().height);
    }
  }, [searchBox]);

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.documentFieldsDescription"
            defaultMessage="Define the fields you expect your indexed documents to have. {docsLink}"
            values={{
              docsLink: (
                <EuiLink href={documentationService.getMappingTypesLink()} target="_blank">
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsDocumentationLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>

      {/* We set the height to avoid a UI jump when going "sticky" */}
      <EuiFlexItem grow={false} style={{ height: `${searchBoxHeight}px` }}>
        <div ref={searchBox} className="mappingsEditor__documentFields__searchBox">
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
