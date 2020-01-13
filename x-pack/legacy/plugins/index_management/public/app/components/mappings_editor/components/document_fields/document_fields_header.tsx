/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef, useState } from 'react';

import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../services/documentation';
import { SearchBox } from './search_fields';

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
  goBackToSearchResult?: () => void;
}

export const DocumentFieldsHeader = React.memo(
  ({ searchValue, onSearchChange, goBackToSearchResult }: Props) => {
    const searchBox = useRef<HTMLDivElement | null>(null);
    // We initially hardcode the height, but we will update it with the DOM value
    const [searchBoxHeight, setSearchBoxHeight] = useState(40);

    useEffect(() => {
      if (searchBox.current !== null) {
        setSearchBoxHeight(searchBox.current.getBoundingClientRect().height);
      }
    }, []);

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
                    {i18n.translate(
                      'xpack.idxMgmt.mappingsEditor.documentFieldsDocumentationLink',
                      {
                        defaultMessage: 'Learn more.',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>

        {/* We set the height to avoid a UI jump when going "sticky" */}
        <EuiFlexItem grow={false} style={{ height: `${searchBoxHeight}px` }}>
          <SearchBox
            ref={searchBox}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            goBackToSearchResult={goBackToSearchResult}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
