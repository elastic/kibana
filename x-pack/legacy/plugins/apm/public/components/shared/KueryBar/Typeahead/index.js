/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Suggestions from './Suggestions';
import ClickOutside from './ClickOutside';
import { EuiFieldSearch, EuiProgress } from '@elastic/eui';

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9
};

export class Typeahead extends Component {
  state = {
    isSuggestionsVisible: false,
    index: null,
    value: '',
    initialValue: ''
  };

  static getDerivedStateFromProps(props, state) {
    const initialValue = props.initialValue ? props.initialValue : '';
    if (initialValue !== state.initialValue) {
      return {
        value: initialValue,
        initialValue
      };
    }

    return null;
  }

  incrementIndex = currentIndex => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.props.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  decrementIndex = currentIndex => {
    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }
    this.setState({ index: previousIndex });
  };

  onKeyUp = event => {
    const { selectionStart } = event.target;
    const { value } = this.state;
    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        this.setState({ isSuggestionsVisible: true });
        this.props.onChange(value, selectionStart);
        break;
      case KEY_CODES.RIGHT:
        this.setState({ isSuggestionsVisible: true });
        this.props.onChange(value, selectionStart);
        break;
    }
  };

  onKeyDown = event => {
    const { isSuggestionsVisible, index, value } = this.state;
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
        if (isSuggestionsVisible && this.props.suggestions[index]) {
          this.selectSuggestion(this.props.suggestions[index]);
        } else {
          this.setState({ isSuggestionsVisible: false });
          this.props.onSubmit(value);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();
        this.setState({ isSuggestionsVisible: false });
        break;
      case KEY_CODES.TAB:
        this.setState({ isSuggestionsVisible: false });
        break;
    }
  };

  selectSuggestion = suggestion => {
    const nextInputValue =
      this.state.value.substr(0, suggestion.start) +
      suggestion.text +
      this.state.value.substr(suggestion.end);

    this.setState({ value: nextInputValue, index: null });
    this.props.onChange(nextInputValue, nextInputValue.length);
  };

  onClickOutside = () => {
    this.setState({ isSuggestionsVisible: false });
  };

  onChangeInputValue = event => {
    const { value, selectionStart } = event.target;
    const hasValue = Boolean(value.trim());
    this.setState({
      value,
      isSuggestionsVisible: hasValue,
      index: null
    });

    if (!hasValue) {
      this.props.onSubmit(value);
    }
    this.props.onChange(value, selectionStart);
  };

  onClickInput = event => {
    const { selectionStart } = event.target;
    this.props.onChange(this.state.value, selectionStart);
  };

  onClickSuggestion = suggestion => {
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  onMouseEnterSuggestion = index => {
    this.setState({ index });
  };

  onSubmit = () => {
    this.props.onSubmit(this.state.value);
    this.setState({ isSuggestionsVisible: false });
  };

  render() {
    const { placeholder } = this.props;

    return (
      <ClickOutside
        onClickOutside={this.onClickOutside}
        style={{ position: 'relative' }}
      >
        <div style={{ position: 'relative' }}>
          <EuiFieldSearch
            fullWidth
            style={{
              backgroundImage: 'none'
            }}
            placeholder={placeholder}
            inputRef={node => {
              if (node) {
                this.inputRef = node;
              }
            }}
            disabled={this.props.disabled}
            value={this.state.value}
            onKeyDown={this.onKeyDown}
            onKeyUp={this.onKeyUp}
            onChange={this.onChangeInputValue}
            onClick={this.onClickInput}
            autoComplete="off"
            spellCheck={false}
          />

          {this.props.isLoading && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              style={{
                bottom: 0,
                top: 'initial'
              }}
            />
          )}
        </div>

        <Suggestions
          show={this.state.isSuggestionsVisible}
          suggestions={this.props.suggestions}
          index={this.state.index}
          onClick={this.onClickSuggestion}
          onMouseEnter={this.onMouseEnterSuggestion}
        />
      </ClickOutside>
    );
  }
}

Typeahead.propTypes = {
  initialValue: PropTypes.string,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  suggestions: PropTypes.array.isRequired,
  placeholder: PropTypes.string.isRequired
};

Typeahead.defaultProps = {
  isLoading: false,
  disabled: false,
  suggestions: []
};
