/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CommitInfo } from '../../../model/commit';
import { Commit } from './commit';

interface Props {
  commits: CommitInfo[];
  date: string;
  repoUri: string;
}

export const CommitGroup = (props: Props) => {
  const commitList = props.commits.map(commit => (
    <Commit commit={commit} key={commit.id} date={props.date} repoUri={props.repoUri} />
  ));

  return (
    <div className="code-timeline__commit-container">
      <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <div className="code-timeline__marker" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h4>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.code.mainPage.history.commitsOnTitle"
                  defaultMessage="Commits on {date}"
                  values={{ date: props.date }}
                />
              </EuiTextColor>
            </h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="code-timeline">{commitList}</div>
    </div>
  );
};
