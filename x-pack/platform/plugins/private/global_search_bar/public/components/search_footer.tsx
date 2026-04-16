/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMac } from '@kbn/shared-ux-utility';

interface SearchFooterProps {
  shortcutKey?: string;
}

export const SearchFooter = ({ shortcutKey = '/' }: SearchFooterProps) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
      wrap
    >
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          <p>
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.helpText.helpTextPrefix"
              defaultMessage="Filter by"
            />
            &nbsp;
            <EuiCode>type:</EuiCode>&nbsp;
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.helpText.helpTextConjunction"
              defaultMessage="or"
            />
            &nbsp;
            <EuiCode>tag:</EuiCode>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <p>
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutDetail"
              defaultMessage="{shortcutDescription} {commandDescription}"
              values={{
                shortcutDescription: (
                  <FormattedMessage
                    id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutInstructionDescription"
                    defaultMessage="Shortcut"
                  />
                ),
                commandDescription: (
                  <EuiCode>
                    {isMac ? (
                      <FormattedMessage
                        id="xpack.globalSearchBar.searchBar.shortcutDescription.macCommandDescription"
                        defaultMessage="Command + {key}"
                        values={{ key: shortcutKey }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.globalSearchBar.searchBar.shortcutDescription.windowsCommandDescription"
                        defaultMessage="Control + {key}"
                        values={{ key: shortcutKey }}
                      />
                    )}
                  </EuiCode>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
