/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Link } from 'react-router-dom';

import { RepositoryUtils } from '../../../common/repository_utils';
import { history } from '../../utils/url';
import { CodeBlockPanel, Position } from '../code_block';

interface Props {
  query: string;
  results: any[];
}

export class CodeResult extends React.PureComponent<Props> {
  public render() {
    const { results, query } = this.props;

    return results.map(item => {
      const { compositeContent, filePath, hits, language, uri } = item;
      const { content, lineMapping, ranges } = compositeContent;
      const key = `${uri}-${filePath}-${query}`;
      const repoLinkUrl = `/${uri}/tree/HEAD/`;
      const fileLinkUrl = `/${uri}/blob/HEAD/${filePath}`; // TODO(rylnd) move these to link helpers
      const lines = content.split('\n');

      return (
        <div key={`resultitem${key}`} data-test-subj="codeSearchResultList">
          <div style={{ marginBottom: '.5rem' }}>
            <Link to={repoLinkUrl}>
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="flexStart"
                gutterSize="none"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {RepositoryUtils.orgNameFromUri(uri)}/
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="default">
                    <strong>{RepositoryUtils.repoNameFromUri(uri)}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Link>
          </div>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="xs"
            style={{ marginBottom: '1rem' }}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{hits}</EuiBadge>
            </EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.code.searchPage.hitsCountText"
                defaultMessage=" hits from "
              />
              <Link to={fileLinkUrl} data-test-subj="codeSearchResultFileItem">
                {filePath}
              </Link>
            </EuiText>
          </EuiFlexGroup>
          <CodeBlockPanel
            key={`code${key}`}
            className="codeResult__code-block"
            lines={lines}
            language={language}
            highlightRanges={ranges}
            lineNumber={i => lineMapping[i]}
            onClick={this.onCodeClick(fileLinkUrl)}
          />
        </div>
      );
    });
  }

  private onCodeClick = (url: string) => (position: Position) => {
    const lineNumber = parseInt(position.lineNumber, 10);

    if (!isNaN(lineNumber)) {
      history.push(`${url}!L${lineNumber}:0`);
    }
  };
}
