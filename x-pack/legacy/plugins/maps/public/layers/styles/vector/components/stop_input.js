/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import uuid from 'uuid/v4';

import { EuiFieldText, EuiPopover, EuiLoadingSpinner, EuiText, EuiSelectable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class StopInput extends Component {

  state = {
    suggestions: [],
    isLoadingSuggestions: false,
    hasPrevFocus: false,
  };

  _datalistId = uuid();

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.value === prevState.prevValue || nextProps.value === prevState.localValue) {
      return null;
    }

    return {
      prevValue: nextProps.value,
      localValue: nextProps.value,
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._debouncedOnChange.cancel();
  }

  _onChange = e => {
    this.setState(
      {
        localValue: e.target.value,
        suggestionsFilter: e.target.value,
        isLoadingSuggestions: true,
      },
      this._debouncedOnChange
    );
  };

  _debouncedOnChange = _.debounce(() => {
    this._loadSuggestions(this.state.suggestionsFilter);
    this.props.onChange(this.state.localValue);
  }, 300);

  _onFocus = () => {
    // populate suggestions on initial focus
    if (!this.state.hasPrevFocus) {
      this.setState(
        {
          hasPrevFocus: true,
          isLoadingSuggestions: true,
          suggestionsFilter: '',
        },
        () => { this._loadSuggestions(this.state.suggestionsFilter); }
      );
    }
  }

  _loadSuggestions = async (filter) => {
    let suggestions = [];
    try {
      suggestions = await this.props.getValueSuggestions(this.state.localValue);
    } catch (error) {
      // ignore suggestions error
    }

    if (this._isMounted && filter === this.state.suggestionsFilter) {
      this.setState({
        isLoadingSuggestions: false,
        suggestions,
      });
    }
  };

  _renderSuggestions() {
    if (this.state.isLoadingSuggestions|| this.state.suggestions.length === 0) {
      return null;
    }

    return (
      <datalist id={this._datalistId}>
        {this.state.suggestions.map(suggestion => {
          return <option key={suggestion} value={suggestion}/>;
        })}
      </datalist>
    );
  }

  render() {
    const {
      onChange, // eslint-disable-line no-unused-vars
      getValueSuggestions, // eslint-disable-line no-unused-vars
      value, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    return (
      <Fragment>
        <EuiFieldText
          {...rest}
          list={this._datalistId}
          onChange={this._onChange}
          value={this.state.localValue}
          isLoading={this.state.isLoadingSuggestions}
          onFocus={this._onFocus}
        />
        {this._renderSuggestions()}
      </Fragment>
    );
  }
}
