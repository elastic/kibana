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
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiCopy,
  EuiTitle,
} from '@elastic/eui';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { RepositoryUtils } from '../../../common/repository_utils';
import { parseCommitMessage } from '../../../common/commit_utils';
import { PathTypes } from '../../common/types';

const COMMIT_ID_LENGTH = 8;

const RepoLink = ({ repoUri }: { repoUri: string }) => {
  const repoOrg = RepositoryUtils.orgNameFromUri(repoUri);
  const repoName = RepositoryUtils.repoNameFromUri(repoUri);
  const repoPath = `#/${repoUri}`;

  return (
    <>
      <EuiLink href={repoPath}>
        {repoOrg} / {repoName}
      </EuiLink>
      <EuiTextColor color="subdued" className="commit__inline-separator">
        •
      </EuiTextColor>
    </>
  );
};

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

const getRevisionPath = (repoUri: string, commitId: string) => {
  const diffPageEnabled = chrome.getInjected('codeDiffPageEnabled');
  if (diffPageEnabled) {
    return `#/${repoUri}/commit/${commitId}`;
  } else {
    return `#/${repoUri}/${PathTypes.tree}/${commitId}`;
  }
};

const CommitActions = ({ commitId, repoUri }: ActionProps) => {
  const revisionPath = getRevisionPath(repoUri, commitId);

  return (
    <div className="commit__actions">
      <EuiCopy textToCopy={commitId}>
        {copy => <EuiButtonIcon aria-label={copyLabel} onClick={copy} iconType="copyClipboard" />}
      </EuiCopy>
      <EuiButtonEmpty
        className="commit__diff-link"
        href={revisionPath}
        aria-label={revisionLinkLabel}
      >
        <EuiText size="s">{commitId}</EuiText>
      </EuiButtonEmpty>
      <EuiButtonIcon
        href={revisionPath}
        aria-label={revisionLinkLabel}
        iconType="editorCodeBlock"
      />
    </div>
  );
};

interface Props {
  commitId: string;
  committer: string;
  date: string;
  message: string;
  repoUri: string;
  showRepoLink?: boolean;
}

export const Commit = (props: Props) => {
  const { commitId, committer, date, message, repoUri, showRepoLink } = props;
  const { summary, body } = parseCommitMessage(message);
  const id = commitId.substring(0, COMMIT_ID_LENGTH);

  return (
    <EuiPanel className="code-timeline__commit--root">
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <div className="eui-textTruncate">
          <EuiTitle size="xxs" className="eui-textTruncate">
            <h4>{summary}</h4>
          </EuiTitle>
          <EuiText size="xs" className="commit__metadata">
            {showRepoLink && <RepoLink repoUri={repoUri} />}
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
        <CommitActions repoUri={repoUri} commitId={id} />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
