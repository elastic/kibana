/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import React, { ChangeEvent } from 'react';
import { SearchOptions, SearchScope } from '../../../model';
import { ReferenceInfo } from '../../../model/commit';
import { MainRouteParams } from '../../common/types';
import { encodeRevisionString, decodeRevisionString } from '../../../common/uri_util';
import { history } from '../../utils/url';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from '../search_bar';
import { StatusIndicator } from '../status_indicator/status_indicator';

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
  buttons: React.ReactNode;
  searchOptions: SearchOptions;
  branches: ReferenceInfo[];
  query: string;
}

export class TopBar extends React.Component<Props, { value: string }> {
  static getDerivedStateFromProps(props: Props) {
    return { value: decodeRevisionString(props.routeParams.revision) };
  }
  public state = {
    value: decodeRevisionString(this.props.routeParams.revision),
  };

  get branch() {
    return this.getBranch(this.state.value);
  }

  getBranch = (revision: string) => {
    const r = decodeRevisionString(revision);
    const branch = this.props.branches.find(b => b.name === r);
    if (branch) {
      return branch.name;
    } else {
      return '';
    }
  };

  get branchOptions() {
    return this.props.branches.map(b => ({
      value: b.name,
      text: b.name,
      ['data-test-subj']: `codeBranchSelectOption-${b.name}${
        this.branch === b.name ? 'Active' : ''
      }`,
    }));
  }

  public onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { resource, org, repo, path = '', pathType } = this.props.routeParams;
    const { value } = e.target;
    this.setState({
      value,
    });
    const revision = this.props.branches.find(b => b.name === value)!.name;
    history.push(
      `/${resource}/${org}/${repo}/${pathType}/${encodeRevisionString(revision)}/${path}`
    );
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
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l" alignItems="center">
              <EuiFlexItem className="codeContainer__select" grow={false}>
                <EuiSelect
                  options={this.branchOptions}
                  value={branch}
                  onChange={this.onChange}
                  data-test-subj="codeBranchSelector"
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
