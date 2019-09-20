/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiGlobalToastList,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { ChangeEvent } from 'react';
import { connect } from 'react-redux';
import { capabilities } from 'ui/capabilities';
import { Repository } from '../../../model';
import { closeToast, importRepo, RepoStatus } from '../../actions';
import { RootState } from '../../reducers';
import { ToastType } from '../../reducers/repository_management';
import { isImportRepositoryURLInvalid } from '../../utils/url';
import { ProjectItem } from './project_item';
import { ProjectSettings } from './project_settings';
import { ImportModal } from '../apm_demo/import_modal';

enum SortOptionsValue {
  AlphabeticalAsc = 'alphabetical_asc',
  AlphabeticalDesc = 'alphabetical_desc',
  UpdatedAsc = 'updated_asc',
  UpdatedDesc = 'updated_desc',
  RecentlyAdded = 'recently_added',
}

const sortFunctionsFactory = (status: { [key: string]: RepoStatus }) => {
  const sortFunctions: { [k: string]: (a: Repository, b: Repository) => number } = {
    [SortOptionsValue.AlphabeticalAsc]: (a: Repository, b: Repository) =>
      a.name!.localeCompare(b.name!),
    [SortOptionsValue.AlphabeticalDesc]: (a: Repository, b: Repository) =>
      b.name!.localeCompare(a.name!),
    [SortOptionsValue.UpdatedAsc]: (a: Repository, b: Repository) =>
      moment(status[b.uri].timestamp).diff(moment(status[a.uri].timestamp)),
    [SortOptionsValue.UpdatedDesc]: (a: Repository, b: Repository) =>
      moment(status[a.uri].timestamp).diff(moment(status[b.uri].timestamp)),
    [SortOptionsValue.RecentlyAdded]: () => {
      return -1;
    },
  };
  return sortFunctions;
};

const sortOptions = [
  {
    value: SortOptionsValue.AlphabeticalAsc,
    inputDisplay: i18n.translate('xpack.code.adminPage.repoTab.sort.aToZDropDownOptionLabel', {
      defaultMessage: 'A to Z',
    }),
  },
  {
    value: SortOptionsValue.AlphabeticalDesc,
    inputDisplay: i18n.translate('xpack.code.adminPage.repoTab.sort.zToADropDownOptionLabel', {
      defaultMessage: 'Z to A',
    }),
  },
  {
    value: SortOptionsValue.UpdatedAsc,
    inputDisplay: i18n.translate(
      'xpack.code.adminPage.repoTab.sort.updatedAscDropDownOptionLabel',
      {
        defaultMessage: 'Last Updated ASC',
      }
    ),
  },
  {
    value: SortOptionsValue.UpdatedDesc,
    inputDisplay: i18n.translate(
      'xpack.code.adminPage.repoTab.sort.updatedDescDropDownOptionLabel',
      {
        defaultMessage: 'Last Updated DESC',
      }
    ),
  },
  // { value: SortOptionsValue.recently_added, inputDisplay: 'Recently Added' },
];

interface Props {
  projects: Repository[];
  status: { [key: string]: RepoStatus };
  importRepo: (repoUrl: string) => void;
  importLoading: boolean;
  toastMessage?: string;
  showToast: boolean;
  toastType?: ToastType;
  closeToast: () => void;
}
interface State {
  showImportProjectModal: boolean;
  importLoading: boolean;
  settingModal: { url?: string; uri?: string; show: boolean };
  repoURL: string;
  isInvalid: boolean;
  sortOption: SortOptionsValue;
}

class CodeProjectTab extends React.PureComponent<Props, State> {
  public static getDerivedStateFromProps(props: Readonly<Props>, state: State) {
    if (state.importLoading && !props.importLoading) {
      return { showImportProjectModal: false, importLoading: props.importLoading, repoURL: '' };
    }
    return { importLoading: props.importLoading };
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      importLoading: false,
      showImportProjectModal: false,
      settingModal: { show: false },
      repoURL: '',
      sortOption: SortOptionsValue.AlphabeticalAsc,
      isInvalid: false,
    };
  }

  public closeModal = () => {
    this.setState({ showImportProjectModal: false, repoURL: '', isInvalid: false });
  };

  public openModal = () => {
    this.setState({ showImportProjectModal: true });
  };

  public openSettingModal = (uri: string, url: string) => {
    this.setState({ settingModal: { uri, url, show: true } });
  };

  public closeSettingModal = () => {
    this.setState({ settingModal: { show: false } });
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      repoURL: e.target.value,
      isInvalid: isImportRepositoryURLInvalid(e.target.value),
    });
  };

  public submitImportProject = () => {
    if (!isImportRepositoryURLInvalid(this.state.repoURL)) {
      this.props.importRepo(this.state.repoURL);
    } else if (!this.state.isInvalid) {
      this.setState({ isInvalid: true });
    }
  };

  public renderImportModal = () => {
    const { isInvalid, repoURL, showImportProjectModal } = this.state;

    if (showImportProjectModal) {
      return (
        <ImportModal
          isInvalid={isInvalid}
          isLoading={this.props.importLoading}
          onChange={this.onChange}
          onClose={this.closeModal}
          onSubmit={this.submitImportProject}
          value={repoURL}
        />
      );
    }
  };

  public setSortOption = (value: string) => {
    this.setState({ sortOption: value as SortOptionsValue });
  };

  public render() {
    const { projects, status, toastMessage, showToast, toastType } = this.props;
    const projectsCount = projects.length;
    const sortedProjects = projects.sort(sortFunctionsFactory(status)[this.state.sortOption]);

    const repoList = sortedProjects.map((repo: Repository) => (
      <ProjectItem
        openSettings={this.openSettingModal}
        key={repo.uri}
        project={repo}
        showStatus={true}
        status={status[repo.uri]}
        enableManagement={capabilities.get().code.admin as boolean}
      />
    ));

    let settings = null;
    if (this.state.settingModal.show) {
      settings = (
        <ProjectSettings
          onClose={this.closeSettingModal}
          repoUri={this.state.settingModal.uri}
          url={this.state.settingModal.url}
        />
      );
    }

    return (
      <div className="code-sidebar" data-test-subj="codeRepositoryList">
        {showToast && (
          <EuiGlobalToastList
            toasts={[{ title: '', color: toastType, text: toastMessage, id: toastMessage || '' }]}
            dismissToast={this.props.closeToast}
            toastLifeTimeMs={6000}
          />
        )}
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.code.adminPage.repoTab.sort.sortByFormLabel', {
                defaultMessage: 'Sort By',
              })}
            >
              <EuiSuperSelect
                options={sortOptions}
                valueOfSelected={this.state.sortOption}
                onChange={this.setSortOption}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow />
          <EuiFlexItem grow />
          <EuiFlexItem>
            {(capabilities.get().code.admin as boolean) && (
              // @ts-ignore
              <EuiButton
                className="codeButton__projectImport"
                onClick={this.openModal}
                data-test-subj="newProjectButton"
              >
                <FormattedMessage
                  id="xpack.code.adminPage.repoTab.importRepoButtonLabel"
                  defaultMessage="Import a new repo"
                />
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiText>
          <h3>
            <FormattedMessage
              id="xpack.code.adminPage.repoTab.repoDescription"
              defaultMessage="{projectsCount} {projectsCount, plural, one {Repo} other {Repos}}"
              values={{ projectsCount }}
            />
          </h3>
        </EuiText>
        <EuiSpacer />
        {repoList}
        {this.renderImportModal()}
        {settings}
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  projects: state.repositoryManagement.repositories,
  status: state.status.status,
  importLoading: state.repositoryManagement.importLoading,
  toastMessage: state.repositoryManagement.toastMessage,
  toastType: state.repositoryManagement.toastType,
  showToast: state.repositoryManagement.showToast,
});

const mapDispatchToProps = {
  importRepo,
  closeToast,
};

export const ProjectTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeProjectTab);
