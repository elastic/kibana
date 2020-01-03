/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { EuiComboBox, EuiFlexItem, EuiFormRow, EuiToolTip } from '@elastic/eui';

export const EntityControl = injectI18n(
  class EntityControl extends React.Component {
    static propTypes = {
      entity: PropTypes.object.isRequired,
      entityFieldValueChanged: PropTypes.func.isRequired,
      forceSelection: PropTypes.bool.isRequired,
      options: PropTypes.array.isRequired,
    };

    state = {
      selectedOptions: undefined,
    };

    constructor(props) {
      super(props);
    }

    componentDidUpdate() {
      const { entity, forceSelection } = this.props;
      const { selectedOptions } = this.state;

      const fieldValue = entity.fieldValue;

      if (
        (selectedOptions === undefined && fieldValue.length > 0) ||
        (Array.isArray(selectedOptions) &&
          fieldValue.length > 0 &&
          selectedOptions[0].label !== fieldValue)
      ) {
        this.setState({
          selectedOptions: [{ label: fieldValue }],
        });
      } else if (Array.isArray(selectedOptions) && fieldValue.length === 0) {
        this.setState({
          selectedOptions: undefined,
        });
      }

      if (forceSelection && this.inputRef) {
        this.inputRef.focus();
      }
    }

    onChange = selectedOptions => {
      const options = selectedOptions.length > 0 ? selectedOptions : undefined;
      this.setState({
        selectedOptions: options,
      });

      const fieldValue =
        Array.isArray(options) && options[0].label.length > 0 ? options[0].label : '';
      this.props.entityFieldValueChanged(this.props.entity, fieldValue);
    };

    render() {
      const { entity, intl, forceSelection, options } = this.props;
      const { selectedOptions } = this.state;

      const control = (
        <EuiComboBox
          inputRef={input => {
            if (input) {
              this.inputRef = input;
            }
          }}
          style={{ minWidth: '300px' }}
          placeholder={intl.formatMessage({
            id: 'xpack.ml.timeSeriesExplorer.enterValuePlaceholder',
            defaultMessage: 'Enter value',
          })}
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onChange}
          isClearable={false}
        />
      );

      const selectMessage = (
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.selectFieldMessage"
          defaultMessage="Select {fieldName}"
          values={{ fieldName: entity.fieldName }}
        />
      );

      return (
        <EuiFlexItem grow={false}>
          <EuiFormRow label={entity.fieldName} helpText={forceSelection ? selectMessage : null}>
            <EuiToolTip position="right" content={forceSelection ? selectMessage : null}>
              {control}
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
      );
    }
  }
);
