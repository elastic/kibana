/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { EuiComboBox } from '@elastic/eui';

export class StopInput extends Component {
  state = {
    suggestions: [],
    isLoadingSuggestions: false,
    hasPrevFocus: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._loadSuggestions.cancel();
  }

  _onFocus = () => {
    if (!this.state.hasPrevFocus) {
      this.setState({ hasPrevFocus: true });
      this._onSearchChange('');
    }
  };

  _onChange = selectedOptions => {
    this.props.onChange(_.get(selectedOptions, '[0].label', ''));
  };

  _onCreateOption = newValue => {
    this.props.onChange(newValue);
  };

  _onSearchChange = async searchValue => {
    this.setState(
      {
        isLoadingSuggestions: true,
        searchValue,
      },
      () => {
        this._loadSuggestions(searchValue);
      }
    );
  };

  _loadSuggestions = _.debounce(async searchValue => {
    let suggestions = [];
    try {
      suggestions = await this.props.getValueSuggestions(searchValue);
    } catch (error) {
      // ignore suggestions error
    }

    if (this._isMounted && searchValue === this.state.searchValue) {
      this.setState({
        isLoadingSuggestions: false,
        suggestions,
      });
    }
  }, 300);

  render() {
    const suggestionOptions = this.state.suggestions.map(suggestion => {
      return { label: `${suggestion}` };
    });

    const selectedOptions = [];
    if (this.props.value) {
      let option = suggestionOptions.find(({ label }) => {
        return label === this.props.value;
      });
      if (!option) {
        option = { label: this.props.value };
        suggestionOptions.unshift(option);
      }
      selectedOptions.push(option);
    }

    return (
      <EuiComboBox
        options={suggestionOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onChange={this._onChange}
        onSearchChange={this._onSearchChange}
        onCreateOption={this._onCreateOption}
        isClearable={false}
        isLoading={this.state.isLoadingSuggestions}
        onFocus={this._onFocus}
        compressed
      />
    );
  }
}
