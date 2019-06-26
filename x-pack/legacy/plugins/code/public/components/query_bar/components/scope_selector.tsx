/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { Component } from 'react';

import { SearchScope } from '../../../../model';
import { SearchScopeText } from '../../../common/types';
import { pxToRem } from '../../../style/variables';

interface Props {
  scope: SearchScope;
  onScopeChanged: (s: SearchScope) => void;
}

export class ScopeSelector extends Component<Props> {
  public scopeOptions = [
    {
      value: SearchScope.DEFAULT,
      inputDisplay: (
        <div>
          <EuiText size="s">
            <EuiIcon type="bullseye" /> {SearchScopeText[SearchScope.DEFAULT]}
          </EuiText>
        </div>
      ),
    },
    {
      value: SearchScope.SYMBOL,
      inputDisplay: (
        <EuiText size="s">
          <EuiIcon type="crosshairs" /> {SearchScopeText[SearchScope.SYMBOL]}
        </EuiText>
      ),
    },
    {
      value: SearchScope.REPOSITORY,
      inputDisplay: (
        <EuiText size="s">
          <EuiIcon type="branch" /> {SearchScopeText[SearchScope.REPOSITORY]}
        </EuiText>
      ),
    },
    {
      value: SearchScope.FILE,
      inputDisplay: (
        <EuiText size="s">
          <EuiIcon type="document" /> {SearchScopeText[SearchScope.FILE]}
        </EuiText>
      ),
    },
  ];

  public render() {
    return (
      <EuiSuperSelect
        style={{ width: pxToRem(200) }}
        options={this.scopeOptions}
        valueOfSelected={this.props.scope}
        onChange={this.props.onScopeChanged}
      />
    );
  }
}
