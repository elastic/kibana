/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiTitle,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiProgress,
  EuiButtonGroupOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import 'github-markdown-css/github-markdown.css';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import { npStart } from 'ui/new_platform';

import { RepositoryUtils } from '../../../common/repository_utils';
import {
  FileTree,
  FileTreeItemType,
  SearchOptions,
  SearchScope,
  WorkerReservedProgress,
  Repository,
  RepoState,
} from '../../../model';
import { CommitInfo, ReferenceInfo } from '../../../model/commit';
import { changeSearchScope, FetchFileResponse, RepoStatus } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
import {
  currentTreeSelector,
  hasMoreCommitsSelector,
  repoUriSelector,
  repoStatusSelector,
} from '../../selectors';
import { encodeRevisionString } from '../../../common/uri_util';
import { history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { CloneStatus } from './clone_status';
import { CommitHistory } from './commit_history';
import { Directory } from './directory';
import { ErrorPanel } from './error_panel';
import { NotFound } from './not_found';
import { TopBar } from './top_bar';

interface Props extends RouteComponentProps<MainRouteParams> {
  isNotFound: boolean;
  fileLoading: boolean;
  repoStatus?: RepoStatus;
  tree: FileTree;
  file: FetchFileResponse | undefined;
  currentTree: FileTree | null;
  commits: CommitInfo[];
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  hasMoreCommits: boolean;
  loadingCommits: boolean;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
  notFoundDirs: string[];
  fileTreeLoadingPaths: string[];
  searchOptions: SearchOptions;
  query: string;
  currentRepository: Repository;
}
const LANG_MD = 'markdown';

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
  Folder = 'Directory',
}

interface State {
  fileLoading: boolean;
}

class CodeContent extends React.PureComponent<Props, State> {
  static getDerivedStateFromProps(props: Props, state: State) {
    if (!props.fileLoading) {
      return { fileLoading: props.fileLoading };
    }
    return null;
  }
  state = {
    fileLoading: this.props.fileLoading,
  };

  componentDidUpdate(prevProps: Props) {
    // after this amount of time, show file loading indicator if necessary
    const TIME_DELAY_MS: number = 500;
    if (!prevProps.fileLoading && this.props.fileLoading && !this.state.fileLoading) {
      setTimeout(
        () =>
          this.setState({
            fileLoading: this.props.fileLoading,
          }),
        TIME_DELAY_MS
      );
    }
  }

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
    const queryString = this.props.location.search;
    const repoUri = `${resource}/${org}/${repo}`;
    switch (id) {
      case ButtonOption.Code:
        history.push(
          `/${repoUri}/${PathTypes.blob}/${encodeRevisionString(revision)}/${path ||
            ''}${queryString}`
        );
        break;
      case ButtonOption.Folder:
        history.push(
          `/${repoUri}/${PathTypes.tree}/${encodeRevisionString(revision)}/${path ||
            ''}${queryString}`
        );
        break;
      case ButtonOption.Blame:
        history.push(
          `/${repoUri}/${PathTypes.blame}/${encodeRevisionString(revision)}/${path ||
            ''}${queryString}`
        );
        break;
      case ButtonOption.History:
        history.push(
          `/${repoUri}/${PathTypes.commits}/${encodeRevisionString(revision)}/${path ||
            ''}${queryString}`
        );
        break;
    }
  };

  public openRawFile = () => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    window.open(
      npStart.core.http.basePath.prepend(
        `/app/code/repo/${repoUri}/raw/${encodeRevisionString(revision)}/${path}`
      )
    );
  };

  renderFileLoadingIndicator = () => {
    const fileName = (this.props.match.params.path || '').split('/').slice(-1)[0];
    return (
      <EuiPage restrictWidth>
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center">
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <h2>{fileName} is loading...</h2>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiProgress size="s" color="primary" />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
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
      currentTree &&
      (currentTree.type === FileTreeItemType.File || currentTree.type === FileTreeItemType.Link)
    ) {
      let isText = true;
      let isMarkdown = false;
      let blameDisabled = false;

      if (this.props.file) {
        const { isUnsupported, isOversize, isImage, lang } = this.props.file;
        isMarkdown = lang === LANG_MD;
        isText = !isUnsupported && !isOversize && !isImage;
        blameDisabled = !!(isUnsupported || isOversize || isImage);
      }
      const rawButtonOptions: EuiButtonGroupOption[] = [
        {
          id: 'Raw',
          label: isText
            ? i18n.translate('xpack.code.mainPage.content.buttons.rawButtonLabel', {
                defaultMessage: 'Raw',
              })
            : i18n.translate('xpack.code.mainPage.content.buttons.downloadButtonLabel', {
                defaultMessage: 'Download',
              }),
        },
      ];
      const buttonOptions = [
        {
          id: ButtonOption.Code,
          label:
            isText && !isMarkdown
              ? i18n.translate('xpack.code.mainPage.content.buttons.codeButtonLabel', {
                  defaultMessage: 'Code',
                })
              : i18n.translate('xpack.code.mainPage.content.buttons.contentButtonLabel', {
                  defaultMessage: 'content',
                }),
        },
        {
          id: ButtonOption.Blame,
          label: i18n.translate('xpack.code.mainPage.content.buttons.blameButtonLabel', {
            defaultMessage: 'Blame',
          }),
          isDisabled: blameDisabled,
        },
        {
          id: ButtonOption.History,
          label: i18n.translate('xpack.code.mainPage.content.buttons.historyButtonLabel', {
            defaultMessage: 'History',
          }),
        },
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
    } else if (this.shouldRenderCloneProgress()) {
      return null;
    } else {
      return (
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
          <EuiButtonGroup
            className="codeButtonGroup"
            buttonSize="s"
            color="primary"
            options={[
              {
                id: ButtonOption.Folder,
                label: i18n.translate('xpack.code.mainPage.content.buttons.folderButtonLabel', {
                  defaultMessage: 'Directory',
                }),
              },
              {
                id: ButtonOption.History,
                label: i18n.translate('xpack.code.mainPage.content.buttons.historyButtonLabel', {
                  defaultMessage: 'History',
                }),
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
          tags={this.props.tags}
          query={this.props.query}
          currentRepository={this.props.currentRepository}
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
        cloneProgress={cloneProgress!}
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
                    <h3>
                      <FormattedMessage
                        id="xpack.code.mainPage.directory.recentCommitsTitle"
                        defaultMessage="Recent Commits"
                      />
                    </h3>
                  </EuiTitle>
                  <EuiButton
                    size="s"
                    href={`#/${resource}/${org}/${repo}/${PathTypes.commits}/${encodeRevisionString(
                      revision
                    )}/${path || ''}`}
                  >
                    <FormattedMessage
                      id="xpack.code.mainPage.directory.viewAllCommitsButtonLabel"
                      defaultMessage="View All"
                    />
                  </EuiButton>
                </React.Fragment>
              }
            />
          </div>
        );
      case PathTypes.blob: {
        const { fileLoading } = this.state;
        if (!file) {
          return (
            fileLoading && (
              <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
                {fileLoading && this.renderFileLoadingIndicator()}
                <Editor showBlame={false} hidden={fileLoading} />
              </EuiFlexGroup>
            )
          );
        } else {
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
            const rawUrl = npStart.core.http.basePath.prepend(
              `/app/code/repo/${repoUri}/raw/${revision}/${path}`
            );
            return (
              <div className="code-auto-margin">
                <img src={rawUrl} alt={rawUrl} />
              </div>
            );
          } else {
            return (
              <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
                {fileLoading && this.renderFileLoadingIndicator()}
                <Editor showBlame={false} hidden={fileLoading} />
              </EuiFlexGroup>
            );
          }
        }
      }
      case PathTypes.blame:
        const { fileLoading } = this.state;
        return (
          <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
            {fileLoading && this.renderFileLoadingIndicator()}
            <Editor showBlame={true} hidden={fileLoading} />
          </EuiFlexGroup>
        );
      case PathTypes.commits:
        return (
          <div className="codeContainer__history">
            <CommitHistory
              repoUri={repoUri}
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
            />
          </div>
        );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  isNotFound: state.file.isNotFound,
  notFoundDirs: state.fileTree.notFoundDirs,
  file: state.file.file,
  tree: state.fileTree.tree,
  fileTreeLoadingPaths: state.fileTree.fileTreeLoadingPaths,
  currentTree: currentTreeSelector(state),
  branches: state.revision.branches,
  tags: state.revision.tags,
  hasMoreCommits: hasMoreCommitsSelector(state),
  loadingCommits: state.revision.loadingCommits,
  repoStatus: repoStatusSelector(state, repoUriSelector(state)),
  searchOptions: state.search.searchOptions,
  query: state.search.query,
  currentRepository: state.repository.repository,
  fileLoading: state.file.loading,
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
