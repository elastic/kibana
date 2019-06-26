/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonGroup, EuiFlexGroup, EuiTitle, EuiLink } from '@elastic/eui';
import 'github-markdown-css/github-markdown.css';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import chrome from 'ui/chrome';

import { RepositoryUtils } from '../../../common/repository_utils';
import {
  FileTree,
  FileTreeItemType,
  SearchOptions,
  SearchScope,
  WorkerReservedProgress,
} from '../../../model';
import { CommitInfo, ReferenceInfo } from '../../../model/commit';
import { changeSearchScope, FetchFileResponse } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RepoState, RepoStatus, RootState } from '../../reducers';
import {
  currentTreeSelector,
  hasMoreCommitsSelector,
  repoUriSelector,
  statusSelector,
} from '../../selectors';
import { encodeRevisionString, history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { CloneStatus } from './clone_status';
import { CommitHistory } from './commit_history';
import { Directory } from './directory';
import { ErrorPanel } from './error_panel';
import { NotFound } from './not_found';
import { TopBar } from './top_bar';

interface Props extends RouteComponentProps<MainRouteParams> {
  isNotFound: boolean;
  repoStatus?: RepoStatus;
  tree: FileTree;
  file: FetchFileResponse | undefined;
  currentTree: FileTree | undefined;
  commits: CommitInfo[];
  branches: ReferenceInfo[];
  hasMoreCommits: boolean;
  loadingCommits: boolean;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
  notFoundDirs: string[];
  fileTreeLoadingPaths: string[];
  searchOptions: SearchOptions;
  query: string;
}
const LANG_MD = 'markdown';

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
  Folder = 'Directory',
}

enum ButtonLabel {
  Code = 'Code',
  Content = 'Content',
  Download = 'Download',
  Raw = 'Raw',
}

class CodeContent extends React.PureComponent<Props> {
  public findNode = (pathSegments: string[], node: FileTree): FileTree | undefined => {
    if (!node) {
      return undefined;
    } else if (pathSegments.length === 0) {
      return node;
    } else if (pathSegments.length === 1) {
      return (node.children || []).find(n => n.name === pathSegments[0]);
    } else {
      const currentFolder = pathSegments.shift();
      const nextNode = (node.children || []).find(n => n.name === currentFolder);
      if (nextNode) {
        return this.findNode(pathSegments, nextNode);
      } else {
        return undefined;
      }
    }
  };

  public switchButton = (id: string) => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    switch (id) {
      case ButtonOption.Code:
        history.push(
          `/${repoUri}/${PathTypes.blob}/${encodeRevisionString(revision)}/${path || ''}`
        );
        break;
      case ButtonOption.Folder:
        history.push(
          `/${repoUri}/${PathTypes.tree}/${encodeRevisionString(revision)}/${path || ''}`
        );
        break;
      case ButtonOption.Blame:
        history.push(
          `/${repoUri}/${PathTypes.blame}/${encodeRevisionString(revision)}/${path || ''}`
        );
        break;
      case ButtonOption.History:
        history.push(
          `/${repoUri}/${PathTypes.commits}/${encodeRevisionString(revision)}/${path || ''}`
        );
        break;
    }
  };

  public openRawFile = () => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    window.open(
      chrome.addBasePath(`/app/code/repo/${repoUri}/raw/${encodeRevisionString(revision)}/${path}`)
    );
  };

  public renderButtons = () => {
    let buttonId: string | undefined;
    switch (this.props.match.params.pathType) {
      case PathTypes.blame:
        buttonId = ButtonOption.Blame;
        break;
      case PathTypes.blob:
        buttonId = ButtonOption.Code;
        break;
      case PathTypes.tree:
        buttonId = ButtonOption.Folder;
        break;
      case PathTypes.commits:
        buttonId = ButtonOption.History;
        break;
      default:
        break;
    }
    const currentTree = this.props.currentTree;
    if (
      this.props.file &&
      currentTree &&
      (currentTree.type === FileTreeItemType.File || currentTree.type === FileTreeItemType.Link)
    ) {
      const { isUnsupported, isOversize, isImage, lang } = this.props.file;
      const isMarkdown = lang === LANG_MD;
      const isText = !isUnsupported && !isOversize && !isImage;

      const buttonOptions = [
        {
          id: ButtonOption.Code,
          label: isText && !isMarkdown ? ButtonLabel.Code : ButtonLabel.Content,
        },
        {
          id: ButtonOption.Blame,
          label: ButtonOption.Blame,
          isDisabled: isUnsupported || isImage || isOversize,
        },
        {
          id: ButtonOption.History,
          label: ButtonOption.History,
        },
      ];
      const rawButtonOptions = [
        { id: 'Raw', label: isText ? ButtonLabel.Raw : ButtonLabel.Download },
      ];

      return (
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
          <EuiButtonGroup
            buttonSize="s"
            color="primary"
            options={buttonOptions}
            type="single"
            idSelected={buttonId}
            onChange={this.switchButton}
            className="codeButtonGroup"
          />
          <EuiButtonGroup
            buttonSize="s"
            color="primary"
            options={rawButtonOptions}
            type="single"
            idSelected={''}
            onChange={this.openRawFile}
            className="codeButtonGroup"
          />
        </EuiFlexGroup>
      );
    } else {
      return (
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
          <EuiButtonGroup
            buttonSize="s"
            color="primary"
            options={[
              {
                id: ButtonOption.Folder,
                label: ButtonOption.Folder,
              },
              {
                id: ButtonOption.History,
                label: ButtonOption.History,
              },
            ]}
            type="single"
            idSelected={buttonId}
            onChange={this.switchButton}
          />
        </EuiFlexGroup>
      );
    }
  };

  public render() {
    return (
      <div className="codeContainer__main">
        <TopBar
          routeParams={this.props.match.params}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          buttons={this.renderButtons()}
          searchOptions={this.props.searchOptions}
          branches={this.props.branches}
          query={this.props.query}
        />
        {this.renderContent()}
      </div>
    );
  }

  public shouldRenderCloneProgress() {
    if (!this.props.repoStatus) {
      return false;
    }
    const { progress, cloneProgress, state } = this.props.repoStatus;
    return (
      !!progress &&
      state === RepoState.CLONING &&
      progress < WorkerReservedProgress.COMPLETED &&
      !RepositoryUtils.hasFullyCloned(cloneProgress)
    );
  }

  public renderCloneProgress() {
    if (!this.props.repoStatus) {
      return null;
    }
    const { progress, cloneProgress } = this.props.repoStatus;
    const { org, repo } = this.props.match.params;
    return (
      <CloneStatus
        repoName={`${org}/${repo}`}
        progress={progress ? progress : 0}
        cloneProgress={cloneProgress}
      />
    );
  }

  public renderContent() {
    const { file, match, tree, fileTreeLoadingPaths, isNotFound, notFoundDirs } = this.props;
    const { path, pathType, resource, org, repo, revision } = match.params;

    // The clone progress rendering should come before the NotFound rendering.
    if (this.shouldRenderCloneProgress()) {
      return this.renderCloneProgress();
    }

    if (isNotFound || notFoundDirs.includes(path || '')) {
      return <NotFound />;
    }

    const repoUri = `${resource}/${org}/${repo}`;
    switch (pathType) {
      case PathTypes.tree:
        const node = this.findNode(path ? path.split('/') : [], tree);
        return (
          <div className="codeContainer__directoryView">
            <Directory node={node} loading={fileTreeLoadingPaths.includes(path)} />
            <CommitHistory
              repoUri={repoUri}
              header={
                <React.Fragment>
                  <EuiTitle size="s" className="codeMargin__title">
                    <h3>Recent Commits</h3>
                  </EuiTitle>
                  <EuiButton
                    size="s"
                    href={`#/${resource}/${org}/${repo}/${PathTypes.commits}/${encodeRevisionString(
                      revision
                    )}/${path || ''}`}
                  >
                    View All
                  </EuiButton>
                </React.Fragment>
              }
            />
          </div>
        );
      case PathTypes.blob:
        if (!file) {
          return null;
        }
        const {
          lang: fileLanguage,
          content: fileContent,
          isUnsupported,
          isOversize,
          isImage,
        } = file;
        if (isUnsupported) {
          return (
            <ErrorPanel
              title={<h2>Unsupported File</h2>}
              content="Unfortunately that’s an unsupported file type and we’re unable to render it here."
            />
          );
        }
        if (isOversize) {
          return (
            <ErrorPanel
              title={<h2>File is too big</h2>}
              content="Sorry about that, but we can’t show files that are this big right now."
            />
          );
        }
        if (fileLanguage === LANG_MD) {
          const markdownRenderers = {
            link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
              <EuiLink href={href} target="_blank">
                {children}
              </EuiLink>
            ),
          };

          return (
            <div className="markdown-body code-markdown-container kbnMarkdown__body">
              <ReactMarkdown
                source={fileContent}
                escapeHtml={true}
                skipHtml={true}
                renderers={markdownRenderers}
              />
            </div>
          );
        } else if (isImage) {
          const rawUrl = chrome.addBasePath(`/app/code/repo/${repoUri}/raw/${revision}/${path}`);
          return (
            <div className="code-auto-margin">
              <img src={rawUrl} alt={rawUrl} />
            </div>
          );
        }
        return (
          <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
            <Editor showBlame={false} />
          </EuiFlexGroup>
        );
      case PathTypes.blame:
        return (
          <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
            <Editor showBlame={true} />
          </EuiFlexGroup>
        );
      case PathTypes.commits:
        return (
          <div className="codeContainer__history">
            <CommitHistory
              repoUri={repoUri}
              header={
                <EuiTitle className="codeMargin__title">
                  <h3>Commit History</h3>
                </EuiTitle>
              }
              showPagination={true}
            />
          </div>
        );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  isNotFound: state.file.isNotFound,
  notFoundDirs: state.file.notFoundDirs,
  file: state.file.file,
  tree: state.file.tree,
  fileTreeLoadingPaths: state.file.fileTreeLoadingPaths,
  currentTree: currentTreeSelector(state),
  branches: state.file.branches,
  hasMoreCommits: hasMoreCommitsSelector(state),
  loadingCommits: state.file.loadingCommits,
  repoStatus: statusSelector(state, repoUriSelector(state)),
  searchOptions: state.search.searchOptions,
  query: state.search.query,
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Content = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
    // @ts-ignore
  )(CodeContent)
);
