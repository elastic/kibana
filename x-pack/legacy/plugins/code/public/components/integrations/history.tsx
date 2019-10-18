/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CommitHistoryComponent } from '../commits';
import { requestCommits } from '../../sagas/file';
import { CommitInfo } from '../../../model/commit';

const PAGE_SIZE = 20;

export const History = (props: { repo: string; file: string; revision: string }) => {
  const [loading, setLoading] = React.useState(true);
  const [commits, setCommits] = React.useState<CommitInfo[]>([]);
  const [hasMore, setHasMore] = React.useState(false);

  const fetchCommits = async (loadMore: boolean) => {
    setLoading(true);
    const revision = loadMore ? commits[commits.length - 1].id : props.revision;
    const newCommits = await requestCommits(
      { uri: props.repo, revision },
      props.file,
      loadMore,
      PAGE_SIZE
    );
    setLoading(false);
    setHasMore(newCommits.length >= PAGE_SIZE);
    setCommits(commits.concat(newCommits));
    return newCommits;
  };

  React.useEffect(() => {
    fetchCommits(false).then(setCommits);
  }, []);

  return (
    <CommitHistoryComponent
      commits={commits}
      fetchMoreCommits={() => fetchCommits(true)}
      loadingCommits={loading}
      hasMoreCommit={hasMore}
      header={
        <EuiTitle className="codeMargin__title">
          <h3>
            <FormattedMessage
              id="xpack.code.mainPage.history.commitHistoryTitle"
              defaultMessage="Commit History"
            />
          </h3>
        </EuiTitle>
      }
      showPagination={true}
      repoUri={props.repo}
    />
  );
};
