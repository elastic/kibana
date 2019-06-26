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
import { encodeRevisionString } from '../../utils/url';
import { history } from '../../utils/url';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from '../search_bar';

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
  buttons: React.ReactNode;
  searchOptions: SearchOptions;
  branches: ReferenceInfo[];
  query: string;
}

export class TopBar extends React.Component<Props, { value: string }> {
  public state = {
    value: 'master',
  };

  public onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { resource, org, repo, path = '', pathType } = this.props.routeParams;
    this.setState({
      value: e.target.value,
    });
    const revision = this.props.branches.find(b => b.name === e.target.value)!.commit.id;
    history.push(
      `/${resource}/${org}/${repo}/${pathType}/${encodeRevisionString(revision)}/${path}`
    );
  };

  public render() {
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
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem
                className="codeContainer__select"
                grow={false}
                style={{ display: 'none' }}
              >
                <EuiSelect
                  options={this.props.branches.map(b => ({ value: b.name, text: b.name }))}
                  onChange={this.onChange}
                />
              </EuiFlexItem>
              <Breadcrumb routeParams={this.props.routeParams} />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.props.buttons}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
