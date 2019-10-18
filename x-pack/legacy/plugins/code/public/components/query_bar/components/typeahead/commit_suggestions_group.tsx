/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import url from 'url';
import { Link } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiToken, EuiText } from '@elastic/eui';
import { SearchScope } from '../../../../../model';
import { CommitIcon } from '../commit_icon';

interface Props {
  query: string;
}

export const CommitSuggestionsGroup = ({ query }: Props) => {
  const searchPath = url.format({
    pathname: '/search',
    query: {
      q: query,
      scope: SearchScope.COMMIT,
    },
  });

  return (
    <div className="codeSearch-suggestion__group">
      <EuiFlexGroup justifyContent="spaceBetween" className="codeSearch-suggestion__group-header">
        <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
          <EuiToken
            iconType={CommitIcon as any}
            displayOptions={{
              fill: true,
              color: 'tokenTint02',
              shape: 'rectangle',
              hideBorder: true,
            }}
          />
          <EuiText className="codeSearch-suggestion__group-title">
            {i18n.translate('xpack.code.searchBar.commitGroupTitle', {
              defaultMessage: 'Commits',
            })}
          </EuiText>
        </EuiFlexGroup>
        <div className="codeSearch-suggestion__link">
          <Link to={searchPath}>
            {' '}
            <FormattedMessage
              id="xpack.code.searchScope.commitDropDownOptionLabel"
              defaultMessage="Search Commits"
            />
          </Link>
        </div>
      </EuiFlexGroup>
    </div>
  );
};
