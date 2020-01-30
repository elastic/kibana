/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { EuiFieldText, EuiPopover, EuiLoadingSpinner, EuiText, EuiSelectable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class StopInput extends Component {
  state = {
    isPopoverOpen: false,
    localValue: '',
    suggestionOptions: [],
    isLoadingSuggestions: false,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.value === prevState.prevValue) {
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
  }

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _openPopover = () => {
    this.setState({ isPopoverOpen: true });
  };

  _togglePopover = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _onChange = e => {
    this.setState(
      {
        localValue: e.target.value,
        isPopoverOpen: true,
      },
      this._debouncedOnChange
    );
  };

  _debouncedOnChange = _.debounce(() => {
    this._loadSuggestions();
    this.props.onChange(this.state.localValue);
  }, 300);

  _loadSuggestions = async () => {
    this.setState({ isLoadingSuggestions: true });

    let suggestions = [];
    try {
      suggestions = await this.props.getValueSuggestions(this.state.localValue);
    } catch (error) {
      // ignore suggestions error
    }

    if (this._isMounted) {
      this.setState({
        isLoadingSuggestions: false,
        suggestionOptions: suggestions.map(suggestion => {
          return {
            value: suggestion,
            label: suggestion,
          };
        }),
      });
    }
  };

  _onSuggestionSelection = options => {
    const selectedOption = options.find(option => {
      return option.checked === 'on';
    });

    if (selectedOption) {
      this.props.onChange(selectedOption.value);
    }
    this._closePopover();
  };

  _renderSuggestions() {
    if (this.state.isLoadingSuggestions) {
      <EuiText>
        <EuiLoadingSpinner size="m" />
        <FormattedMessage
          id="xpack.maps.stopInput.loadingSuggestionsMsg"
          defaultMessage="Loading suggestions"
        />
      </EuiText>;
    }

    if (this.state.suggestionOptions.length === 0) {
      return null;
    }

    return (
      <EuiSelectable options={this.state.suggestionOptions} onChange={this._onSuggestionSelection}>
        {list => list}
      </EuiSelectable>
    );
  }

  render() {
    const {
      onChange, // eslint-disable-line no-unused-vars
      getValueSuggestions, // eslint-disable-line no-unused-vars
      value, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    const input = (
      <EuiFieldText
        {...rest}
        onFocus={this._loadSuggestions}
        onChange={this._onChange}
        value={this.state.localValue}
      />
    );

    return (
      <EuiPopover
        ownFocus
        button={input}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        attachToAnchor
        panelPaddingSize="none"
      >
        {this._renderSuggestions()}
      </EuiPopover>
    );
  }
}
