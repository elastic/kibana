/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SearchOptions, SearchScope, Repository } from '../../../model';
import { ReferenceInfo } from '../../../model/commit';
import { MainRouteParams } from '../../common/types';
import { decodeRevisionString } from '../../../common/uri_util';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from '../search_bar';
import { StatusIndicator } from '../status_indicator/status_indicator';
import { BranchSelector } from './branch_selector';

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
  buttons: React.ReactNode;
  searchOptions: SearchOptions;
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  query: string;
  currentRepository?: Repository;
}

export class TopBar extends React.Component<Props, { value: string }> {
  static getDerivedStateFromProps(props: Props) {
    return { value: decodeRevisionString(props.routeParams.revision) };
  }
  public state = {
    value: decodeRevisionString(this.props.routeParams.revision),
  };

  public get branch() {
    return this.getBranch(this.state.value);
  }

  getBranch = (revision: string) => {
    const r = decodeRevisionString(revision);
    if (r.toUpperCase() === 'HEAD' && this.props.currentRepository) {
      return this.props.currentRepository.defaultBranch;
    }
    if (this.props.branches.length === 0 && this.props.tags.length === 0) {
      return r;
    }
    const branch = this.props.branches.find(b => b.name === r);
    const tag = this.props.tags.find(b => b.name === r);
    if (branch) {
      return branch.name;
    } else if (tag) {
      return tag.name;
    } else {
      return `tree: ${r}`;
    }
  };

  public get branchOptions() {
    return this.props.branches.map(b => ({
      value: b.name,
      text: b.name,
      ['data-test-subj']: `codeBranchSelectOption-${b.name}${
        this.branch === b.name ? 'Active' : ''
      }`,
    }));
  }

  getHrefFromRevision = (r: string) => {
    const { resource, org, repo, path = '', pathType } = this.props.routeParams;
    return `#/${resource}/${org}/${repo}/${pathType}/${r}/${path}`;
  };

  public render() {
    const { branch } = this;
    return (
      <div className="code-top-bar__container">
        <SearchBar
          query={this.props.query}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          enableSubmitWhenOptionsChanged={false}
          searchOptions={this.props.searchOptions}
        />
        <EuiFlexGroup
          gutterSize="none"
          justifyContent="spaceBetween"
          className="codeTopBar__toolbar"
        >
          <EuiFlexItem className="codeTopBar__left">
            <EuiFlexGroup gutterSize="l" alignItems="center">
              <EuiFlexItem className="codeContainer__select" grow={false}>
                <BranchSelector
                  getHrefFromRevision={this.getHrefFromRevision}
                  branches={this.props.branches}
                  tags={this.props.tags}
                  revision={branch!}
                />
              </EuiFlexItem>
              <Breadcrumb routeParams={this.props.routeParams} />
              <EuiFlexItem grow={false}>
                <StatusIndicator />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.props.buttons}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
