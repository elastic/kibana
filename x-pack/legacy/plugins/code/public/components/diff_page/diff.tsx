/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiBadge,
  EuiNotificationBadge,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { CommitDiff, FileDiff } from '../../../common/git_diff';
import { SearchScope, SearchOptions } from '../../../model';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
import { SearchBar } from '../search_bar';
import { DiffEditor } from './diff_editor';
import { Accordion } from './accordion';

const COMMIT_ID_LENGTH = 16;

interface Props extends RouteComponentProps<{ resource: string; org: string; repo: string }> {
  commit: CommitDiff | null;
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
  searchOptions: SearchOptions;
}

export enum DiffLayout {
  Unified,
  Split,
}

const Difference = (props: {
  fileDiff: FileDiff;
  repoUri: string;
  revision: string;
  initialIsOpen: boolean;
}) => (
  <Accordion
    initialIsOpen={props.initialIsOpen}
    className="codeAccordion"
    title={
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        justifyContent="spaceBetween"
        className="codeDiff__header"
      >
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="none">
                <EuiNotificationBadge size="m">{props.fileDiff.additions}</EuiNotificationBadge>
                <EuiNotificationBadge className="codeDiffDeletion" size="m">
                  {props.fileDiff.deletions}
                </EuiNotificationBadge>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>{props.fileDiff.path}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div
            className="euiButton euiButton--primary euiButton--small codeViewFile__button"
            role="button"
          >
            <span className="euiButton__content">
              <Link to={`/${props.repoUri}/blob/${props.revision}/${props.fileDiff.path}`}>
                View File
              </Link>
            </span>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    <DiffEditor
      originCode={props.fileDiff.originCode!}
      modifiedCode={props.fileDiff.modifiedCode!}
      language={props.fileDiff.language!}
      renderSideBySide={true}
    />
  </Accordion>
);

export class DiffPage extends React.Component<Props> {
  public state = {
    diffLayout: DiffLayout.Split,
  };

  public setLayoutUnified = () => {
    this.setState({ diffLayout: DiffLayout.Unified });
  };

  public setLayoutSplit = () => {
    this.setState({ diffLayout: DiffLayout.Split });
  };

  public render() {
    const DEFAULT_OPEN_FILE_DIFF_COUNT = 1;
    const { commit, match } = this.props;
    const { repo, org, resource } = match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    if (!commit) {
      return null;
    }
    const { additions, deletions, files } = commit;
    const fileCount = files.length;
    const diffs = commit.files.map((file, index) => (
      <Difference
        repoUri={repoUri}
        revision={commit.commit.id}
        fileDiff={file}
        key={file.path}
        initialIsOpen={index < DEFAULT_OPEN_FILE_DIFF_COUNT}
      />
    ));
    return (
      <div>
        <SearchBar
          query={this.props.query}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          searchOptions={this.props.searchOptions}
          enableSubmitWhenOptionsChanged={false}
        />
        <div className="codeDiffCommitMessage">
          <EuiText size="s">{commit.commit.message}</EuiText>
        </div>
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" className="codeDiffMetadata">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiIcon type="dataVisualizer" color="subdued" className="codeVisualizerIcon" />
              Showing
              <b className="codeDiffChangedFiles"> {fileCount} Changed files </b>
              with
              <b> {additions} additions</b> and <b>{deletions} deletions </b>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              Committed by
              <b> {commit.commit.committer} </b>
              <EuiBadge color="hollow">{commit.commit.id.substr(0, COMMIT_ID_LENGTH)}</EuiBadge>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div className="codeDiff__panel">{diffs}</div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  commit: state.commit.commit,
  query: state.search.query,
  repoScope: state.search.searchOptions.repoScope.map(r => r.uri),
  searchOptions: state.search.searchOptions,
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Diff = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(DiffPage)
);
