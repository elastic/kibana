/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CommitGroup } from './group';
import { CommitInfo } from '../../../model/commit';
import { RootState } from '../../reducers';
import { hasMoreCommitsSelector, treeCommitsSelector } from '../../selectors';
import { fetchMoreCommits } from '../../actions';

const CommitHistoryLoading = () => (
  <div className="codeLoader">
    <EuiLoadingSpinner size="xl" />
  </div>
);

const PageButtons = (props: { loading?: boolean; disabled: boolean; onClick: () => void }) => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiButton
        onClick={props.onClick}
        iconType="arrowDown"
        isLoading={props.loading}
        isDisabled={props.disabled}
        size="s"
      >
        <FormattedMessage id="xpack.code.mainPage.history.moreButtonLabel" defaultMessage="More" />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const commitDateFormatMap: { [key: string]: string } = {
  en: 'MMMM Do, YYYY',
  'zh-cn': 'YYYY年MoDo',
};

export const CommitHistoryComponent = (props: {
  commits: CommitInfo[];
  repoUri: string;
  header: React.ReactNode;
  loadingCommits?: boolean;
  showPagination?: boolean;
  hasMoreCommit?: boolean;
  fetchMoreCommits: any;
}) => {
  const commits = _.groupBy(props.commits, commit => moment(commit.updated).format('YYYYMMDD'));
  const commitDates = Object.keys(commits).sort((a, b) => b.localeCompare(a)); // sort desc
  const locale = i18n.getLocale();
  const commitDateFormat =
    locale in commitDateFormatMap ? commitDateFormatMap[locale] : commitDateFormatMap.en;
  const commitList = commitDates.map(cd => (
    <CommitGroup
      commits={commits[cd]}
      date={moment(cd).format(commitDateFormat)}
      key={cd}
      repoUri={props.repoUri}
    />
  ));
  return (
    <div className="codeContainer__commitMessages">
      <div className="codeHeader__commit">{props.header}</div>
      {commitList}
      {!props.showPagination && props.loadingCommits && <CommitHistoryLoading />}
      {props.showPagination && (
        <PageButtons
          disabled={!props.hasMoreCommit || props.commits.length < 10}
          onClick={() => props.fetchMoreCommits(props.repoUri)}
          loading={props.loadingCommits}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({
  file: state.file.file,
  commits: treeCommitsSelector(state) || [],
  loadingCommits: state.revision.loadingCommits,
  hasMoreCommit: hasMoreCommitsSelector(state),
});

const mapDispatchToProps = {
  fetchMoreCommits,
};
export const CommitHistory = connect(
  mapStateToProps,
  mapDispatchToProps
)(CommitHistoryComponent);
