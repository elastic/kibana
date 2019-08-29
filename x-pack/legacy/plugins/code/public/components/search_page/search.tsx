/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import querystring from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import chrome from 'ui/chrome';
import url from 'url';

import { DocumentSearchResult, SearchOptions, SearchScope } from '../../../model';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { ProjectItem } from '../admin_page/project_item';
import { SearchBar } from '../search_bar';
import { CodeResult } from './code_result';
import { EmptyPlaceholder } from './empty_placeholder';
import { Pagination } from './pagination';
import { SideBar } from './side_bar';

interface Props {
  searchOptions: SearchOptions;
  query: string;
  scope: SearchScope;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<string>;
  isLoading: boolean;
  error?: Error;
  documentSearchResults?: DocumentSearchResult;
  repositorySearchResults?: any;
  onSearchScopeChanged: (s: SearchScope) => void;
}

interface State {
  uri: string;
}

class SearchPage extends React.PureComponent<Props, State> {
  public state = {
    uri: '',
  };

  public searchBar: any = null;

  public componentDidMount() {
    chrome.breadcrumbs.push({ text: `Search` });
  }

  public componentWillUnmount() {
    chrome.breadcrumbs.pop();
  }

  public onLanguageFilterToggled = (lang: string) => {
    const { languages, repositories, query, page } = this.props;
    let tempLangs: Set<string> = new Set();
    if (languages && languages.has(lang)) {
      // Remove this language filter
      tempLangs = new Set(languages);
      tempLangs.delete(lang);
    } else {
      // Add this language filter
      tempLangs = languages ? new Set(languages) : new Set();
      tempLangs.add(lang);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: page,
            langs: Array.from(tempLangs).join(','),
            repos: repositories ? Array.from(repositories).join(',') : undefined,
          },
        })
      );
    };
  };

  public onRepositoryFilterToggled = (repo: string) => {
    const { languages, repositories, query } = this.props;
    let tempRepos: Set<string> = new Set();
    if (repositories && repositories.has(repo)) {
      // Remove this repository filter
      tempRepos = new Set(repositories);
      tempRepos.delete(repo);
    } else {
      // Add this language filter
      tempRepos = repositories ? new Set(repositories) : new Set();
      tempRepos.add(repo);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: 1,
            langs: languages ? Array.from(languages).join(',') : undefined,
            repos: Array.from(tempRepos).join(','),
          },
        })
      );
    };
  };

  public render() {
    const {
      query,
      scope,
      documentSearchResults,
      languages,
      isLoading,
      repositories,
      repositorySearchResults,
    } = this.props;

    let mainComp = isLoading ? (
      <div>
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <EuiText textAlign="center">Loading...</EuiText>
        <EuiSpacer size="m" />
        <EuiText textAlign="center">
          <EuiLoadingSpinner size="xl" />
        </EuiText>
      </div>
    ) : (
      <EmptyPlaceholder
        query={query}
        toggleOptionsFlyout={() => {
          this.searchBar.toggleOptionsFlyout();
        }}
      />
    );
    let repoStats: any[] = [];
    let languageStats: any[] = [];
    if (
      scope === SearchScope.REPOSITORY &&
      repositorySearchResults &&
      repositorySearchResults.total > 0
    ) {
      const { repositories: repos, from, total } = repositorySearchResults;
      const resultComps =
        repos &&
        repos.map((repo: any) => (
          <EuiFlexItem key={repo.uri}>
            <ProjectItem
              key={repo.uri}
              project={repo}
              showStatus={false}
              enableManagement={false}
            />
          </EuiFlexItem>
        ));
      const to = from + repos.length;
      const statsComp = (
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="xpack.code.searchPage.showingResultsTitle"
              defaultMessage="Showing {from} - {to} of {total} {total, plural,
                one {result}
                other {results}
              }."
              values={{ from: from + 1, to, total }}
            />
          </h1>
        </EuiTitle>
      );
      mainComp = (
        <div className="codeContainer__search--inner">
          {statsComp}
          <EuiSpacer />
          <div className="codeContainer__search--results">{resultComps}</div>
        </div>
      );
    } else if (scope === SearchScope.DEFAULT && documentSearchResults) {
      const { stats, results } = documentSearchResults!;
      const { total, from, to, page, totalPage } = stats!;
      languageStats = stats!.languageStats;
      repoStats = stats!.repoStats;
      if (documentSearchResults.total > 0) {
        const statsComp = (
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.code.searchPage.showingResultsTitle"
                defaultMessage="Showing {from} - {to} of {total} {total, plural,
                  one {result}
                  other {results}
                }."
                values={{ from: from + 1, to, total }}
              />
            </h1>
          </EuiTitle>
        );
        mainComp = (
          <div className="codeContainer__search--inner">
            {statsComp}
            <EuiSpacer />
            <div className="codeContainer__search--results">
              <CodeResult results={results!} query={this.props.query} />
            </div>
            <Pagination query={this.props.query} totalPage={totalPage} currentPage={page - 1} />
          </div>
        );
      }
    }

    return (
      <div className="codeContainer__root">
        <div className="codeContainer__rootInner">
          <SideBar
            query={this.props.query}
            scope={scope}
            repositories={repositories}
            languages={languages}
            repoFacets={repoStats}
            langFacets={languageStats}
            onLanguageFilterToggled={this.onLanguageFilterToggled}
            onRepositoryFilterToggled={this.onRepositoryFilterToggled}
          />
          <div className="codeContainer__search--main">
            <SearchBar
              searchOptions={this.props.searchOptions}
              query={this.props.query}
              onSearchScopeChanged={this.props.onSearchScopeChanged}
              enableSubmitWhenOptionsChanged={true}
              ref={(element: any) => (this.searchBar = element)}
            />
            {mainComp}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  ...state.search,
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Search = connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchPage);
