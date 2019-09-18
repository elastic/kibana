/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiTextColor } from '@elastic/eui';
import { CommitInfo } from '../../../model/commit';
import { CommitLink } from '../diff_page/commit_link';

const COMMIT_ID_LENGTH = 8;

interface Props {
  commit: CommitInfo;
  date: string;
  repoUri: string;
}

export const Commit = (props: Props) => {
  const { date, commit, repoUri } = props;
  const { message, committer, id } = commit;
  const commitId = id
    .split('')
    .slice(0, COMMIT_ID_LENGTH)
    .join('');

  return (
    <EuiPanel className="code-timeline__commit--root">
      <div className="eui-textTruncate">
        <EuiText size="s">
          <p className="eui-textTruncate">{message}</p>
        </EuiText>
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {committer} · {date}
          </EuiTextColor>
        </EuiText>
      </div>
      <div className="code-commit-id">
        <CommitLink repoUri={repoUri} commit={commitId} />
      </div>
    </EuiPanel>
  );
};
