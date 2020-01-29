/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { EuiFieldText } from '@elastic/eui';

export class StopInput extends Component {
  state = {
    localValue: '',
    suggestions: [],
    isLoadingSuggestions: false,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.value === prevState.prevValue) {
      return null;
    }

    return {
      prevValue: nextProps.value,
      localValue: nextProps.value,
      suggestions: [],
      isLoadingSuggestions: false,
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onChange = e => {
    this.setState({ localValue: e.target.value }, this._debouncedOnChange);
  };

  _debouncedOnChange = _.debounce(() => {
    this._loadSuggestions();
    this.props.onChange(this.state.localValue);
  }, 300);

  async _loadSuggestions() {
    this.setState({ isLoadingSuggestions: true });

    let suggestions = [];
    try {
      suggestions = await this.props.getValueSuggestions(this.state.localValue);
    } catch (error) {
      // ignore suggestions error
    }

    if (this._isMounted) {
      console.log(suggestions);
      this.setState({ isLoadingSuggestions: false, suggestions });
    }
  }

  render() {
    const {
      onChange, // eslint-disable-line no-unused-vars
      getValueSuggestions, // eslint-disable-line no-unused-vars
      value, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    return <EuiFieldText {...rest} onChange={this._onChange} value={this.state.localValue} />;
  }
}
