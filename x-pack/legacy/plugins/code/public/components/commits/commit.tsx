/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiCopy,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CommitInfo } from '../../../model/commit';
import { MAIN_ROOT } from '../routes';
import { PathTypes } from '../../common/types';
import { parseCommitMessage } from '../../../common/commit_utils';

const COMMIT_ID_LENGTH = 8;

interface ActionProps {
  repoUri: string;
  commitId: string;
}

const copyLabel = i18n.translate('xpack.code.commits.copyCommitAriaLabel', {
  defaultMessage: 'Copy the full commit ID',
});
const revisionLinkLabel = i18n.translate('xpack.code.commits.revisionLinkAriaLabel', {
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
  const { summary, body } = parseCommitMessage(message);
  const commitId = id
    .split('')
    .slice(0, COMMIT_ID_LENGTH)
    .join('');

  return (
    <EuiPanel className="code-timeline__commit--root">
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <div className="eui-textTruncate">
          <EuiTitle size="xxs">
            <h4>{summary}</h4>
          </EuiTitle>
          <EuiText size="xs" className="commit__metadata">
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.code.commits.committedDescription"
                defaultMessage="Committed on {date} by {committer}"
                values={{ committer, date }}
              />
            </EuiTextColor>
          </EuiText>
          <EuiText size="s">
            <p className="eui-textTruncate">{body}</p>
          </EuiText>
        </div>
        <CommitActions repoUri={repoUri} commitId={commitId} />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
