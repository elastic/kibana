/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiCopy,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CommitInfo } from '../../../model/commit';
import { MAIN_ROOT } from '../routes';
import { PathTypes } from '../../common/types';

const COMMIT_ID_LENGTH = 8;

interface ActionProps {
  repoUri: string;
  commitId: string;
}

const copyLabel = i18n.translate('xpack.code.commits.copyCommitSha', {
  defaultMessage: 'Copy the full commit ID',
});
const revisionLinkLabel = i18n.translate('xpack.code.commits.revisionLink', {
  defaultMessage: 'View the project at this commit',
});

const CommitActions = ({ commitId, repoUri }: ActionProps) => {
  const revisionUri =
    '#' +
    MAIN_ROOT.replace(/:pathType\(.*\)/, PathTypes.tree)
      .replace(':resource/:org/:repo', repoUri)
      .replace(':revision', commitId);

  return (
    <div className="commit__actions">
      <EuiCopy textToCopy={commitId}>
        {copy => <EuiButtonIcon aria-label={copyLabel} onClick={copy} iconType="copyClipboard" />}
      </EuiCopy>
      <EuiButtonEmpty
        className="commit__diff-link"
        href={revisionUri}
        aria-label={revisionLinkLabel}
      >
        <EuiText size="s">{commitId}</EuiText>
      </EuiButtonEmpty>
      <EuiButtonIcon href={revisionUri} aria-label={revisionLinkLabel} iconType="editorCodeBlock" />
    </div>
  );
};

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
      <CommitActions repoUri={repoUri} commitId={commitId} />
    </EuiPanel>
  );
};
