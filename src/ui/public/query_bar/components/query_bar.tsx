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

import { IndexPattern } from 'ui/index_patterns';

import { compact, debounce, get, isEqual } from 'lodash';
import React, { Component } from 'react';
import { getFromLegacyIndexPattern } from 'ui/index_patterns/static_utils';
import { kfetch } from 'ui/kfetch';
import { PersistedLog } from 'ui/persisted_log';
import { Storage } from 'ui/storage';
// @ts-ignore
import { timeHistory } from 'ui/timefilter/time_history';
import {
  AutocompleteSuggestion,
  AutocompleteSuggestionType,
  getAutocompleteProvider,
} from '../../autocomplete_providers';
import chrome from '../../chrome';
import { fromUser, toUser } from '../../parse_query';
import { matchPairs } from '../lib/match_pairs';
import { QueryLanguageSwitcher } from './language_switcher';
import { SuggestionsComponent } from './typeahead/suggestions_component';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiSuperDatePicker,
} from '@elastic/eui';

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';

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
const recentSearchType: AutocompleteSuggestionType = 'recentSearch';

interface Query {
  query: string;
  language: string;
}

interface DateRange {
  from: string;
  to: string;
}

interface Props {
  query: Query;
  onSubmit: ({ dateRange, query }: { dateRange: DateRange; query: Query }) => void;
  disableAutoFocus?: boolean;
  appName: string;
  indexPatterns: IndexPattern[];
  store: Storage;
  intl: InjectedIntl;
  showDatePicker: boolean;
  from: string;
  to: string;
  isPaused: boolean;
  refreshInterval: number;
  onRefreshChange?: (isPaused: boolean, refreshInterval: number) => void;
}

interface State {
  query: Query;
  inputIsPristine: boolean;
  isSuggestionsVisible: boolean;
  index: number | null;
  suggestions: AutocompleteSuggestion[];
  suggestionLimit: number;
  currentProps?: Props;
  from: string;
  to: string;
}

export class QueryBarUI extends Component<Props, State> {
  public static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    let nextQuery = null;
    if (nextProps.query.query !== prevState.query.query) {
      nextQuery = {
        query: toUser(nextProps.query.query),
        language: nextProps.query.language,
      };
    } else if (nextProps.query.language !== prevState.query.language) {
      nextQuery = {
        query: '',
        language: nextProps.query.language,
      };
    }

    let nextDateRange = null;
    if (
      nextProps.from !== get(prevState, 'currentProps.from') ||
      nextProps.to !== get(prevState, 'currentProps.to')
    ) {
      nextDateRange = {
        from: nextProps.from,
        to: nextProps.to,
      };
    }

    const nextState = {
      currentProps: nextProps,
    };
    if (nextQuery) {
      nextState.query = nextQuery;
    }
    if (nextDateRange) {
      nextState.from = nextDateRange.from;
      nextState.to = nextDateRange.to;
    }
    return nextState;
  }
  private static defaultProps = {
    showDatePicker: false,
    from: 'now-15m',
    to: 'now',
  };

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
  public state = {
    query: {
      query: toUser(this.props.query.query),
      language: this.props.query.language,
    },
    inputIsPristine: true,
    isSuggestionsVisible: false,
    index: null,
    suggestions: [],
    suggestionLimit: 50,
    from: this.props.from,
    to: this.props.to,
  };

  public updateSuggestions = debounce(async () => {
    const suggestions = (await this.getSuggestions()) || [];
    if (!this.componentIsUnmounting) {
      this.setState({ suggestions });
    }
  }, 100);

  public inputRef: HTMLInputElement | null = null;

  private componentIsUnmounting = false;
  private persistedLog: PersistedLog | null = null;

  public isDirty = () => {
    return (
      this.state.query.query !== this.props.query.query ||
      this.state.from !== this.props.from ||
      this.state.to !== this.props.to
    );
  };

  public increaseLimit = () => {
    this.setState({
      suggestionLimit: this.state.suggestionLimit + 50,
    });
  };

  public incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.state.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  public decrementIndex = (currentIndex: number) => {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      this.setState({ index: this.state.suggestions.length - 1 });
    } else {
      this.setState({ index: previousIndex });
    }
  };

  public getSuggestions = async () => {
    if (!this.inputRef) {
      return;
    }

    const {
      query: { query, language },
    } = this.state;
    const recentSearchSuggestions = this.getRecentSearchSuggestions(query);

    const autocompleteProvider = getAutocompleteProvider(language);
    if (
      !autocompleteProvider ||
      !Array.isArray(this.props.indexPatterns) ||
      compact(this.props.indexPatterns).length === 0
    ) {
      return recentSearchSuggestions;
    }

    const indexPatterns = getFromLegacyIndexPattern(this.props.indexPatterns);
    const getAutocompleteSuggestions = autocompleteProvider({ config, indexPatterns });

    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const suggestions: AutocompleteSuggestion[] = await getAutocompleteSuggestions({
      query,
      selectionStart,
      selectionEnd,
    });
    return [...suggestions, ...recentSearchSuggestions];
  };

  public selectSuggestion = ({
    type,
    text,
    start,
    end,
  }: {
    type: AutocompleteSuggestionType;
    text: string;
    start: number;
    end: number;
  }) => {
    if (!this.inputRef) {
      return;
    }

    const query = this.state.query.query;
    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const value = query.substr(0, selectionStart) + query.substr(selectionEnd);

    this.setState(
      {
        query: {
          ...this.state.query,
          query: value.substr(0, start) + text + value.substr(end),
        },
        index: null,
      },
      () => {
        if (!this.inputRef) {
          return;
        }

        this.inputRef.setSelectionRange(start + text.length, start + text.length);

        if (type === recentSearchType) {
          this.onSubmit();
        } else {
          this.updateSuggestions();
        }
      }
    );
  };

  public getRecentSearchSuggestions = (query: string) => {
    if (!this.persistedLog) {
      return [];
    }
    const recentSearches = this.persistedLog.get();
    const matchingRecentSearches = recentSearches.filter(recentQuery => {
      const recentQueryString = typeof recentQuery === 'object' ? toUser(recentQuery) : recentQuery;
      return recentQueryString.includes(query);
    });
    return matchingRecentSearches.map(recentSearch => {
      const text = recentSearch;
      const start = 0;
      const end = query.length;
      return { type: recentSearchType, text, start, end };
    });
  };

  public onOutsideClick = () => {
    this.setState({ isSuggestionsVisible: false, index: null });
  };

  public onClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      this.onInputChange(event.target.value);
    }
  };

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    this.onSubmit(() => event.preventDefault());
  };

  public onClickSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!this.inputRef) {
      return;
    }
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  public onMouseEnterSuggestion = (index: number) => {
    this.setState({ index });
  };

  public onInputChange = (value: string) => {
    const hasValue = Boolean(value.trim());

    this.setState({
      query: {
        query: value,
        language: this.state.query.language,
      },
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null,
      suggestionLimit: 50,
    });
  };

  public onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.updateSuggestions();
    this.onInputChange(event.target.value);
  };

  public onTimeChange = ({ start, end }: { start: string; end: string }) => {
    this.setState({
      from: start,
      to: end,
    });
  };

  public onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      this.setState({ isSuggestionsVisible: true });
      if (event.target instanceof HTMLInputElement) {
        this.onInputChange(event.target.value);
      }
    }
  };

  public onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const { isSuggestionsVisible, index } = this.state;
      const preventDefault = event.preventDefault.bind(event);
      const { target, key, metaKey } = event;
      const { value, selectionStart, selectionEnd } = target;
      const updateQuery = (query: string, newSelectionStart: number, newSelectionEnd: number) => {
        this.setState(
          {
            query: {
              ...this.state.query,
              query,
            },
          },
          () => {
            target.setSelectionRange(newSelectionStart, newSelectionEnd);
          }
        );
      };

      switch (event.keyCode) {
        case KEY_CODES.DOWN:
          event.preventDefault();
          if (isSuggestionsVisible && index !== null) {
            this.incrementIndex(index);
          } else {
            this.setState({ isSuggestionsVisible: true, index: 0 });
          }
          break;
        case KEY_CODES.UP:
          event.preventDefault();
          if (isSuggestionsVisible && index !== null) {
            this.decrementIndex(index);
          }
          break;
        case KEY_CODES.ENTER:
          event.preventDefault();
          if (isSuggestionsVisible && index !== null && this.state.suggestions[index]) {
            this.selectSuggestion(this.state.suggestions[index]);
          } else {
            this.onSubmit(() => event.preventDefault());
          }
          break;
        case KEY_CODES.ESC:
          event.preventDefault();
          this.setState({ isSuggestionsVisible: false, index: null });
          break;
        case KEY_CODES.TAB:
          this.setState({ isSuggestionsVisible: false, index: null });
          break;
        default:
          if (selectionStart !== null && selectionEnd !== null) {
            matchPairs({
              value,
              selectionStart,
              selectionEnd,
              key,
              metaKey,
              updateQuery,
              preventDefault,
            });
          }

          break;
      }
    }
  };

  public onSubmit = (preventDefault?: () => void) => {
    if (preventDefault) {
      preventDefault();
    }

    if (this.persistedLog) {
      this.persistedLog.add(this.state.query.query);
    }

    timeHistory.add({
      from: this.state.from,
      to: this.state.to,
    });

    this.props.onSubmit({
      query: {
        query: fromUser(this.state.query.query),
        language: this.state.query.language,
      },
      dateRange: {
        from: this.state.from,
        to: this.state.to,
      },
    });
    this.setState({ isSuggestionsVisible: false });
  };

  public onSelectLanguage = (language: string) => {
    // Send telemetry info every time the user opts in or out of kuery
    // As a result it is important this function only ever gets called in the
    // UI component's change handler.
    kfetch({
      pathname: '/api/kibana/kql_opt_in_telemetry',
      method: 'POST',
      body: JSON.stringify({ opt_in: language === 'kuery' }),
    });

    this.props.store.set('kibana.userQueryLanguage', language);
    this.props.onSubmit({
      query: {
        query: '',
        language,
      },
      dateRange: {
        from: this.props.from,
        to: this.props.to,
      },
    });
  };

  public componentDidMount() {
    this.persistedLog = new PersistedLog(
      `typeahead:${this.props.appName}-${this.state.query.language}`,
      {
        maxLength: config.get('history:limit'),
        filterDuplicates: true,
      }
    );
    this.updateSuggestions();
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.query.language !== this.props.query.language) {
      this.persistedLog = new PersistedLog(
        `typeahead:${this.props.appName}-${this.state.query.language}`,
        {
          maxLength: config.get('history:limit'),
          filterDuplicates: true,
        }
      );
      this.updateSuggestions();
    }
  }

  public componentWillUnmount() {
    this.updateSuggestions.cancel();
    this.componentIsUnmounting = true;
  }

  public render() {
    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiOutsideClickDetector onOutsideClick={this.onOutsideClick}>
            {/* position:relative required on container so the suggestions appear under the query bar*/}
            <div
              style={{ position: 'relative' }}
              role="combobox"
              aria-haspopup="true"
              aria-expanded={this.state.isSuggestionsVisible}
              aria-owns="typeahead-items"
              aria-controls="typeahead-items"
            >
              <form role="form" name="queryBarForm">
                <div className="kuiLocalSearch" role="search">
                  <div className="kuiLocalSearchAssistedInput">
                    <EuiFieldText
                      className="kuiLocalSearchAssistedInput__input"
                      placeholder={this.props.intl.formatMessage({
                        id: 'common.ui.queryBar.searchInputPlaceholder',
                        defaultMessage: 'Search… (e.g. status:200 AND extension:PHP)',
                      })}
                      value={this.state.query.query}
                      onKeyDown={this.onKeyDown}
                      onKeyUp={this.onKeyUp}
                      onChange={this.onChange}
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
                      aria-label={this.props.intl.formatMessage({
                        id: 'common.ui.queryBar.searchInputAriaLabel',
                        defaultMessage: 'Search input',
                      })}
                      type="text"
                      data-test-subj="queryInput"
                      aria-autocomplete="list"
                      aria-controls="typeahead-items"
                      aria-activedescendant={
                        this.state.isSuggestionsVisible ? 'suggestion-' + this.state.index : ''
                      }
                      role="textbox"
                    />
                    <div className="kuiLocalSearchAssistedInput__assistance">
                      <QueryLanguageSwitcher
                        language={this.state.query.language}
                        onSelectLanguage={this.onSelectLanguage}
                      />
                    </div>
                  </div>
                </div>
              </form>

              <SuggestionsComponent
                show={this.state.isSuggestionsVisible}
                suggestions={this.state.suggestions.slice(0, this.state.suggestionLimit)}
                index={this.state.index}
                onClick={this.onClickSuggestion}
                onMouseEnter={this.onMouseEnterSuggestion}
                loadMore={this.increaseLimit}
              />
            </div>
          </EuiOutsideClickDetector>
        </EuiFlexItem>
        {this.renderDatePicker()}
        <EuiFlexItem grow={false}>
          <EuiButton
            aria-label={this.props.intl.formatMessage({
              id: 'common.ui.queryBar.searchButtonAriaLabel',
              defaultMessage: 'Search',
            })}
            data-test-subj="querySubmitButton"
            color={this.isDirty() ? 'secondary' : 'primary'}
            fill
            onClick={this.onClickSubmitButton}
          >
            {this.isDirty() ? (
              <FormattedMessage id="common.ui.queryBar.updateButtonLabel" defaultMessage="Update" />
            ) : (
              <FormattedMessage
                id="common.ui.queryBar.refreshButtonLabel"
                defaultMessage="Refresh"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderDatePicker() {
    if (!this.props.showDatePicker) {
      return null;
    }

    const recentlyUsedRanges = timeHistory
      .get()
      .map(({ from, to }: { from: string; to: string }) => {
        return {
          start: from,
          end: to,
        };
      });

    return (
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={this.state.from}
          end={this.state.to}
          isPaused={this.props.isPaused}
          refreshInterval={this.props.refreshInterval}
          onTimeChange={this.onTimeChange}
          onRefreshChange={this.props.onRefreshChange}
          showUpdateButton={false}
          recentlyUsedRanges={recentlyUsedRanges}
        />
      </EuiFlexItem>
    );
  }
}

export const QueryBar = injectI18n(QueryBarUI);
