/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { EuiComboBox, EuiFieldText } from '@elastic/eui';

export class StopInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      suggestions: [],
      isLoadingSuggestions: false,
      hasPrevFocus: false,
      fieldDataType: undefined,
      localFieldTextValue: props.value,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFieldDataType();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._loadSuggestions.cancel();
  }

  async _loadFieldDataType() {
    const fieldDataType = await this.props.field.getDataType();
    if (this._isMounted) {
      this.setState({ fieldDataType });
    }
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

  _onFieldTextChange = event => {
    this.setState({ localFieldTextValue: event.target.value });
    // onChange can cause UI lag, ensure smooth input typing by debouncing onChange
    this._debouncedOnFieldTextChange();
  };

  _debouncedOnFieldTextChange = _.debounce(() => {
    this.props.onChange(this.state.localFieldTextValue);
  }, 500);

  _renderSuggestionInput() {
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

  _renderTextInput() {
    return (
      <EuiFieldText
        value={this.state.localFieldTextValue}
        onChange={this._onFieldTextChange}
        compressed
      />
    );
  }

  render() {
    if (!this.state.fieldDataType) {
      return null;
    }

    // autocomplete service can not provide suggestions for non string fields (and boolean) because it uses
    // term aggregation include parameter. Include paramerter uses a regular expressions that only supports string type
    return this.state.fieldDataType === 'string' || this.state.fieldDataType === 'boolean'
      ? this._renderSuggestionInput()
      : this._renderTextInput();
  }
}
