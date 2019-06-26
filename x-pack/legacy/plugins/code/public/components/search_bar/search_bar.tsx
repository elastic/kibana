/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import React from 'react';
import url from 'url';

import { SearchOptions, SearchScope } from '../../../model';
import { SearchScopeText } from '../../common/types';
import { history } from '../../utils/url';
import { ShortcutsProvider, Shortcut } from '../shortcuts';

import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';

interface Props {
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
  searchOptions: SearchOptions;
  enableSubmitWhenOptionsChanged: boolean;
}

export class SearchBar extends React.PureComponent<Props> {
  public queryBar: any = null;

  public onSearchChanged = (query: string) => {
    // Merge the default repository scope if necessary.
    const repoScopes = this.props.searchOptions.repoScope.map(repo => repo.uri);
    if (this.props.searchOptions.defaultRepoScopeOn && this.props.searchOptions.defaultRepoScope) {
      repoScopes.push(this.props.searchOptions.defaultRepoScope.uri);
    }

    // Update the url and push to history as well.
    const previousQueries = querystring.parse(history.location.search.replace('?', ''));
    const queries: any =
      repoScopes.length === 0
        ? {
            ...previousQueries,
            q: query,
          }
        : {
            ...previousQueries,
            q: query,
            repoScope: repoScopes,
          };
    history.push(
      url.format({
        pathname: '/search',
        query: queries,
      })
    );
  };

  public toggleOptionsFlyout() {
    if (this.queryBar) {
      this.queryBar.toggleOptionsFlyout();
    }
  }

  public onSubmit = (q: string) => {
    // ignore empty query
    if (q.trim().length > 0) {
      this.onSearchChanged(q);
    }
  };

  public onSelect = (item: AutocompleteSuggestion) => {
    history.push(item.selectUrl);
  };

  public suggestionProviders = [
    new SymbolSuggestionsProvider(),
    new FileSuggestionsProvider(),
    new RepositorySuggestionsProvider(),
  ];

  public render() {
    return (
      <div className="codeSearchbar__container">
        <ShortcutsProvider />
        <Shortcut
          keyCode="p"
          help={SearchScopeText[SearchScope.REPOSITORY]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.REPOSITORY);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <Shortcut
          keyCode="y"
          help={SearchScopeText[SearchScope.SYMBOL]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.SYMBOL);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <Shortcut
          keyCode="s"
          help={SearchScopeText[SearchScope.DEFAULT]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.DEFAULT);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <QueryBar
          query={this.props.query}
          onSubmit={this.onSubmit}
          onSelect={this.onSelect}
          appName="code"
          suggestionProviders={this.suggestionProviders}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          enableSubmitWhenOptionsChanged={this.props.enableSubmitWhenOptionsChanged}
          ref={instance => {
            if (instance) {
              // @ts-ignore
              this.queryBar = instance.getWrappedInstance();
            }
          }}
        />
      </div>
    );
  }
}
