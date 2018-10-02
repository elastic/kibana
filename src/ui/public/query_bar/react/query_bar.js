/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { QueryLanguageSwitcher } from './language_switcher';
import { toUser, fromUser } from '../../parse_query/index.js';
import { matchPairs } from '../lib/match_pairs';
import { Suggestions } from './typeahead/suggestions';
import { getAutocompleteProvider } from '../../autocomplete_providers';
import { getFromLegacyIndexPattern } from '../../index_patterns/static_utils';
import { PersistedLog } from '../../persisted_log';
import { chrome } from '../../chrome/chrome';
import { debounce } from 'lodash';

import {
  EuiFieldText,
  EuiOutsideClickDetector,
} from '@elastic/eui';

/*
TODO: styling
TODO: refactoring
 */


const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9,
  HOME: 36,
  END: 35,
};

const config = chrome.getUiSettingsClient();

export class QueryBar extends Component {

  /*
   Keep the "draft" value in local state until the user actually submits the query. There are a couple advantages:

    1. Each app doesn't have to maintain its own "draft" value if it wants to put off updating the query in app state
    until the user manually submits their changes. Most apps have watches on the query value in app state so we don't
    want to trigger those on every keypress. Also, some apps (e.g. dashboard) already juggle multiple query values,
    each with slightly different semantics and I'd rather not add yet another variable to the mix.

    2. Changes to the local component state won't trigger an Angular digest cycle. Triggering digest cycles on every
    keypress has been a major source of performance issues for us in previous implementations of the query bar.
    See https://github.com/elastic/kibana/issues/14086
  */
  state = {
    query: {
      query: toUser(this.props.query.query),
      language: this.props.query.language,
    },
    inputIsPristine: true,
    isSuggestionsVisible: false,
    index: null,
    suggestions: [],
  };

  incrementIndex = (currentIndex) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.state.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  decrementIndex = (currentIndex) => {
    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }
    this.setState({ index: previousIndex });
  };

  updateSuggestions = debounce(async () => {
    const suggestions = await this.getSuggestions();
    if (!this.componentIsUnmounting) {
      this.setState({ suggestions });
    }
  }, 100);

  getSuggestions = async () => {
    const { query: { query, language } } = this.state;
    const recentSearchSuggestions = this.getRecentSearchSuggestions(query);

    const autocompleteProvider = getAutocompleteProvider(language);
    if (!autocompleteProvider) return recentSearchSuggestions;

    const indexPatterns = getFromLegacyIndexPattern(this.props.indexPatterns);
    const getAutocompleteSuggestions = autocompleteProvider({ config, indexPatterns });

    const { selectionStart, selectionEnd } = this.inputRef;
    const suggestions = await getAutocompleteSuggestions({ query, selectionStart, selectionEnd });
    return [...suggestions, ...recentSearchSuggestions];
  };

  selectSuggestion = ({ type, text, start, end }) => {
    const query = this.state.query.query;
    const { selectionStart, selectionEnd } = this.inputRef;
    const value = query.substr(0, selectionStart) + query.substr(selectionEnd);

    this.setState({
      query: {
        ...this.state.query,
        query: value.substr(0, start) + text + value.substr(end),
      },
      index: null,
    }, () => {
      this.inputRef.setSelectionRange(start + text.length, start + text.length);

      if (type === 'recentSearch') {
        this.onSubmit();
      } else {
        this.updateSuggestions();
      }
    });
  };

  getRecentSearchSuggestions = (query) => {
    if (!this.persistedLog) return [];
    const recentSearches = this.persistedLog.get();
    const matchingRecentSearches = recentSearches.filter((recentQuery) => {
      const recentQueryString = typeof recentQuery === 'object' ? toUser(recentQuery) : recentQuery;
      return recentQueryString.includes(query);
    });
    return matchingRecentSearches.map(recentSearch => {
      const text = recentSearch;
      const start = 0;
      const end = query.length;
      return { type: 'recentSearch', text, start, end };
    });
  };

  onOutsideClick = () => {
    this.setState({ isSuggestionsVisible: false });
  };

  onClickInput = (event) => {
    this.onInputChange(event);
  };

  onClickSuggestion = (suggestion) => {
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  onMouseEnterSuggestion = (index) => {
    this.setState({ index });
  };

  onInputChange = (event) => {
    this.updateSuggestions();

    const { value } = event.target;
    const hasValue = Boolean(value.trim());

    this.setState({
      query: {
        query: value,
        language: this.state.query.language,
      },
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null,
    });
  };

  onKeyUp = (event) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      this.setState({ isSuggestionsVisible: true });
      this.onInputChange(event);
    }
  };

  onKeyDown = (event) => {
    const { isSuggestionsVisible, index } = this.state;
    const preventDefault = event.preventDefault.bind(event);
    const { target, key, metaKey } = event;
    const { value, selectionStart, selectionEnd } = target;
    const updateQuery = (query, selectionStart, selectionEnd) => {
      this.setState(
        {
          query: {
            ...this.state.query,
            query,
          },
        },
        () => {
          target.setSelectionRange(selectionStart, selectionEnd);
        },
      );
    };

    switch (event.keyCode) {
      case KEY_CODES.DOWN:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.incrementIndex(index);
        } else {
          this.setState({ isSuggestionsVisible: true, index: 0 });
        }
        break;
      case KEY_CODES.UP:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.decrementIndex(index);
        }
        break;
      case KEY_CODES.ENTER:
        event.preventDefault();
        if (isSuggestionsVisible && this.state.suggestions[index]) {
          this.selectSuggestion(this.state.suggestions[index]);
        } else {
          this.onSubmit(event);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();
        this.setState({ isSuggestionsVisible: false });
        break;
      case KEY_CODES.TAB:
        this.setState({ isSuggestionsVisible: false });
        break;
      default:
        matchPairs({
          value,
          selectionStart,
          selectionEnd,
          key,
          metaKey,
          updateQuery,
          preventDefault,
        });
        break;
    }
  };

  onSubmit = (event) => {
    if (event) {
      event.preventDefault();
    }

    this.persistedLog.add(this.state.query.query);

    this.props.onSubmit({
      query: fromUser(this.state.query.query),
      language: this.state.query.language,
    });
    this.setState({ isSuggestionsVisible: false });
  };

  componentDidMount() {
    this.persistedLog = new PersistedLog(`typeahead:${this.props.appName}-${this.state.query.language}`, {
      maxLength: config.get('history:limit'),
      filterDuplicates: true,
    });
    this.updateSuggestions();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.query.query !== prevState.query.query) {
      return {
        query: {
          query: toUser(nextProps.query.query),
          language: nextProps.query.language,
        },
      };
    }
    else if (nextProps.query.language !== prevState.query.language) {
      return {
        query: {
          query: '',
          language: nextProps.query.language,
        },
      };
    }

    return null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.query.language !== this.props.query.language) {
      this.persistedLog = new PersistedLog(`typeahead:${this.props.appName}-${this.state.query.language}`, {
        maxLength: config.get('history:limit'),
        filterDuplicates: true,
      });
      this.updateSuggestions();
    }
  }

  componentWillUnmount() {
    this.updateSuggestions.cancel();
    this.componentIsUnmounting = true;
  }

  render() {
    return (
      <EuiOutsideClickDetector
        onOutsideClick={this.onOutsideClick}
      >
        {/* position:relative required on container so the suggestions appear under the query bar*/}
        <div
          style={{ position: 'relative' }}
          role="combobox"
          aria-haspopup="true"
          aria-expanded={this.state.isSuggestionsVisible}
          aria-owns="typeahead-items"
        >
          <form
            role="form"
            name="queryBarForm"
            onKeyDown={this.onKeyDown}
            onKeyUp={this.onKeyUp}
          >
            <div
              className="kuiLocalSearch"
              role="search"
            >
              <div className="kuiLocalSearchAssistedInput">
                <EuiFieldText
                  placeholder="Search... (e.g. status:200 AND extension:PHP)"
                  value={this.state.query.query}
                  onChange={this.onInputChange}
                  onClick={this.onClickInput}
                  fullWidth
                  autoFocus={!this.props.disableAutoFocus}
                  inputRef={node => {
                    if (node) {
                      this.inputRef = node;
                    }
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  icon="console"
                  aria-label="Search input"
                  type="text"
                  data-test-subj="queryInput"
                  aria-autocomplete="list"
                  aria-controls="typeahead-items"
                  aria-activedescendant={'suggestion-' + this.state.index}
                  role="textbox"
                />
                <div className="kuiLocalSearchAssistedInput__assistance">
                  <QueryLanguageSwitcher
                    language={this.state.query.language}
                    onSelectLanguage={(language) => {
                      this.props.store.set('kibana.userQueryLanguage', language);
                      this.props.onSubmit({
                        query: '',
                        language: language,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </form>

          <Suggestions
            show={this.state.isSuggestionsVisible}
            suggestions={this.state.suggestions}
            index={this.state.index}
            onClick={this.onClickSuggestion}
            onMouseEnter={this.onMouseEnterSuggestion}
          />
        </div>
      </EuiOutsideClickDetector>
    );
  }
}


QueryBar.propTypes = {
  query: PropTypes.shape({
    query: PropTypes.string,
    language: PropTypes.string,
  }),
  onSubmit: PropTypes.func,
  disableAutoFocus: PropTypes.bool,
  appName: PropTypes.string,
  indexPatterns: PropTypes.array,
  store: PropTypes.object,
};
