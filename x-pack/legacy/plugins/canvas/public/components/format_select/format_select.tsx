/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiSpacer, EuiFieldText } from '@elastic/eui';

interface Props {
  /** The ID of the argument form */
  argId: string;
  /** The current format string value */
  argValue: string;
  /** The preset format options to populate the select control */
  formatOptions: Array<{ value: string; text: string }>;
  /** The default custom format to initially populate the text field with */
  defaultCustomFormat: string;
  /** The handler to commit the new value */
  onValueChange: (value: string) => void;
}

export class FormatSelect extends PureComponent<Props> {
  static propTypes = {
    argId: PropTypes.string,
    argValue: PropTypes.string,
    formatOptions: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string,
        text: PropTypes.string,
      })
    ).isRequired,
    onValueChange: PropTypes.func,
  };

  state = {
    isCustomFormat: !this.props.formatOptions
      .map(({ value }) => value)
      .includes(this.props.argValue),
  };

  _options = this.props.formatOptions.concat({ value: 'custom', text: 'Custom' });

  _handleTextChange = (ev: ChangeEvent<HTMLInputElement>) =>
    this.props.onValueChange(ev.target.value);

  _handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => {
    const { onValueChange, defaultCustomFormat } = this.props;
    const { value } = this._options[ev.target.selectedIndex];

    if (value === 'custom') {
      this.setState({ isCustomFormat: true });
      return onValueChange(defaultCustomFormat);
    }

    if (this.state.isCustomFormat) {
      this.setState({ isCustomFormat: false });
    }

    return onValueChange(value);
  };

  render() {
    const { argId, argValue, defaultCustomFormat } = this.props;
    const { isCustomFormat } = this.state;

    return (
      <Fragment>
        <EuiSelect
          compressed
          id={argId}
          value={isCustomFormat ? 'custom' : argValue}
          options={this._options}
          onChange={this._handleSelectChange}
        />
        {isCustomFormat && (
          <Fragment>
            <EuiSpacer size="s" />
            <EuiFieldText
              placeholder={defaultCustomFormat}
              value={argValue}
              compressed
              onChange={this._handleTextChange}
            />
          </Fragment>
        )}
      </Fragment>
    );
  }
}
