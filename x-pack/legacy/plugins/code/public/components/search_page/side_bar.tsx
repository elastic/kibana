/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiToken,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { RepositoryUtils } from '../../../common/repository_utils';
import { SearchScope } from '../../../model';

interface Props {
  query: string;
  scope: SearchScope;
  languages?: Set<string>;
  repositories?: Set<string>;
  langFacets: any[];
  repoFacets: any[];
  onLanguageFilterToggled: (lang: string) => any;
  onRepositoryFilterToggled: (repo: string) => any;
}

export class SideBar extends React.PureComponent<Props> {
  voidFunc = () => void 0;

  renderLangFacets = () => {
    return this.props.langFacets.map((item, index) => {
      const isSelected = this.props.languages && this.props.languages.has(item.name);
      return (
        <EuiFacetButton
          className="codeFilter__item"
          key={`langstats${index}`}
          icon={<div className="codeFilter__facet-indent" />}
          onClick={this.props.onLanguageFilterToggled(item.name)}
          quantity={item.value}
          isSelected={isSelected}
          data-test-subj="codeSearchLanguageFilterItem"
          buttonRef={this.voidFunc}
        >
          {item.name}
        </EuiFacetButton>
      );
    });
  };

  renderRepoFacets = () => {
    return this.props.repoFacets.map((item, index) => {
      const isSelected = !!this.props.repositories && this.props.repositories.has(item.name);
      return (
        <EuiFacetButton
          className="codeFilter__item"
          key={`repostats${index}`}
          icon={<div className="codeFilter__facet-indent" />}
          onClick={this.props.onRepositoryFilterToggled(item.name)}
          quantity={item.value}
          isSelected={isSelected}
          buttonRef={this.voidFunc}
        >
          {RepositoryUtils.repoNameFromUri(item.name)}
        </EuiFacetButton>
      );
    });
  };

  public render() {
    return (
      <div className="codeSidebar__container">
        <div className="codeFilter__groups">
          <EuiFlexGroup className="codeFilter__group" gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false} className="codeFilter__group-icon">
              <EuiToken iconType="tokenRepo" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="xpack.code.searchPage.sideBar.repositoriesTitle"
                    defaultMessage="Repositories"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFacetGroup className="codeFilter__group">{this.renderRepoFacets()}</EuiFacetGroup>
          <EuiFlexGroup className="codeFilter__group" gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false} className="codeFilter__group-icon">
              <EuiToken
                iconType="tokenElement"
                displayOptions={{ color: 'tokenTint07', shape: 'rectangle', fill: true }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="xpack.code.searchPage.sideBar.languagesTitle"
                    defaultMessage="Languages"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFacetGroup
            className="codeFilter__group"
            data-test-subj="codeSearchLanguageFilterList"
          >
            {this.renderLangFacets()}
          </EuiFacetGroup>
        </div>
      </div>
    );
  }
}
