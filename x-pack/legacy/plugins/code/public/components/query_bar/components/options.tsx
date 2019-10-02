/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiNotificationBadge,
} from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { unique } from 'lodash';
import React, { Component } from 'react';
import { SearchOptions as ISearchOptions, Repository } from '../../../../model';

interface State {
  isFlyoutOpen: boolean;
  repoScope: Repository[];
  query: string;
  defaultRepoScopeOn: boolean;
}

interface Props {
  repositorySearch: (p: { query: string }) => void;
  saveSearchOptions: (searchOptions: ISearchOptions) => void;
  repoSearchResults: any[];
  searchLoading: boolean;
  searchOptions: ISearchOptions;
  defaultRepoOptions: Repository[];
  defaultSearchScope?: Repository;
}

export class SearchOptions extends Component<Props, State> {
  public state: State = {
    query: '',
    isFlyoutOpen: false,
    repoScope: this.props.searchOptions.repoScope,
    defaultRepoScopeOn: this.props.searchOptions.defaultRepoScopeOn,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.searchOptions.defaultRepoScopeOn !== prevProps.searchOptions.defaultRepoScopeOn
    ) {
      this.setState({ defaultRepoScopeOn: this.props.searchOptions.defaultRepoScopeOn });
    }
  }

  public applyAndClose = () => {
    if (this.state.defaultRepoScopeOn && this.props.defaultSearchScope) {
      this.props.saveSearchOptions({
        repoScope: unique([...this.state.repoScope, this.props.defaultSearchScope], r => r.uri),
        defaultRepoScopeOn: this.state.defaultRepoScopeOn,
      });
    } else {
      this.props.saveSearchOptions({
        repoScope: this.state.repoScope,
        defaultRepoScopeOn: this.state.defaultRepoScopeOn,
      });
    }
    this.setState({ isFlyoutOpen: false });
  };

  public removeRepoScope = (r: string) => () => {
    this.setState(prevState => {
      const nextState: any = {
        repoScope: prevState.repoScope.filter(rs => rs.uri !== r),
      };
      if (this.props.defaultSearchScope && r === this.props.defaultSearchScope.uri) {
        nextState.defaultRepoScopeOn = false;
      }
      return nextState;
    });
  };

  public render() {
    let optionsFlyout;
    const repoScope =
      this.state.defaultRepoScopeOn && this.props.defaultSearchScope
        ? unique([...this.state.repoScope, this.props.defaultSearchScope], (r: Repository) => r.uri)
        : this.state.repoScope;
    if (this.state.isFlyoutOpen) {
      const selectedRepos = repoScope.map(r => {
        return (
          <div key={r.uri}>
            <EuiPanel paddingSize="s">
              <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
                <div className="codeQueryBar">
                  <EuiText>
                    <EuiTextColor color="subdued">{r.org}/</EuiTextColor>
                    <b>{r.name}</b>
                  </EuiText>
                </div>
                <EuiIcon
                  className="codeUtility__cursor--pointer"
                  type="cross"
                  onClick={this.removeRepoScope(r.uri)}
                />
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="s" />
          </div>
        );
      });

      const repoCandidates = this.state.query
        ? this.props.repoSearchResults.map(repo => ({
            label: repo.name,
          }))
        : this.props.defaultRepoOptions.map(repo => ({
            label: repo.name,
          }));

      optionsFlyout = (
        <EuiFlyout
          onClose={this.closeOptionsFlyout}
          size="s"
          aria-labelledby="flyoutSmallTitle"
          className="codeSearchSettings__flyout"
        >
          <EuiFlyoutHeader>
            <EuiTitle size="s">
              <EuiFlexGroup id="flyoutSmallTitle" alignItems="center" gutterSize="none">
                <EuiNotificationBadge size="m" className="codeQueryBar__filter-badge">
                  {repoScope.length}
                </EuiNotificationBadge>
                <EuiTextColor color="secondary">
                  <FormattedMessage
                    id="xpack.code.searchBar.searchFilterTitle"
                    defaultMessage="{filterCount, plural, one {Advanced Filter} other {Advanced Filters}}"
                    values={{ filterCount: repoScope.length }}
                  />
                </EuiTextColor>
              </EuiFlexGroup>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.code.searchBar.searchScopeTitle"
                  defaultMessage="Search Scope"
                />
              </h3>
            </EuiTitle>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.code.searchBar.addToScopeDescription"
                defaultMessage="Add indexed repos to your search scope"
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiComboBox
              noSuggestions={repoCandidates.length === 0}
              placeholder={i18n.translate('xpack.code.searchBar.addRepoPlaceholder', {
                defaultMessage: 'Search to add repos',
              })}
              async={true}
              options={repoCandidates}
              selectedOptions={[]}
              isLoading={this.props.searchLoading}
              onChange={this.onRepoChange}
              onSearchChange={this.onRepoSearchChange}
              isClearable={true}
            />
            <EuiSpacer size="m" />
            {selectedRepos}
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiButton onClick={this.applyAndClose} fill={true} iconSide="right">
                <FormattedMessage
                  id="xpack.code.searchBar.applyAndCloseButtonLabel"
                  defaultMessage="Apply and Close"
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    }

    return (
      <div>
        <div className="kuiLocalSearchAssistedInput__assistance">
          <EuiButtonEmpty size="xs" onClick={this.toggleOptionsFlyout}>
            <EuiNotificationBadge size="m" className="codeQueryBar__filter-badge">
              {repoScope.length}
            </EuiNotificationBadge>
            <EuiTextColor color="secondary">
              <FormattedMessage
                id="xpack.code.searchBar.searchFilterTitle"
                defaultMessage="{filterCount, plural, one {Advanced Filter} other {Advanced Filters}}"
                values={{ filterCount: repoScope.length }}
              />
            </EuiTextColor>
          </EuiButtonEmpty>
        </div>
        {optionsFlyout}
      </div>
    );
  }

  private onRepoSearchChange = (searchValue: string) => {
    this.setState({ query: searchValue });
    if (searchValue) {
      this.props.repositorySearch({
        query: searchValue,
      });
    }
  };

  private onRepoChange = (repos: any) => {
    this.setState(prevState => ({
      repoScope: unique(
        [
          ...prevState.repoScope,
          ...repos.map((r: any) =>
            [...this.props.repoSearchResults, ...this.props.defaultRepoOptions].find(
              rs => rs.name === r.label
            )
          ),
        ],
        (r: Repository) => r.uri
      ),
    }));
  };

  private toggleOptionsFlyout = () => {
    this.setState({
      isFlyoutOpen: !this.state.isFlyoutOpen,
    });
  };

  private closeOptionsFlyout = () => {
    this.setState({
      isFlyoutOpen: false,
      repoScope: this.props.searchOptions.repoScope,
      defaultRepoScopeOn: this.props.searchOptions.defaultRepoScopeOn,
    });
  };
}
