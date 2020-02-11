/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';

export interface Entity {
  fieldName: string;
  fieldValue: any;
  fieldValues: any;
}

interface EntityControlProps {
  entity: Entity;
  entityFieldValueChanged: (entity: Entity, fieldValue: any) => void;
  isLoading: boolean;
  onSearchChange: (entity: Entity, queryTerm: string) => void;
  forceSelection: boolean;
  options: EuiComboBoxOptionProps[];
}

interface EntityControlState {
  selectedOptions: EuiComboBoxOptionProps[] | undefined;
  isLoading: boolean;
  options: EuiComboBoxOptionProps[] | undefined;
}

export class EntityControl extends Component<EntityControlProps, EntityControlState> {
  inputRef: any;

  state = {
    selectedOptions: undefined,
    options: undefined,
    isLoading: false,
  };

  componentDidUpdate(prevProps: EntityControlProps) {
    const { entity, forceSelection, isLoading, options: propOptions } = this.props;
    const { options: stateOptions, selectedOptions } = this.state;

    const { fieldValue } = entity;

    let selectedOptionsUpdate: EuiComboBoxOptionProps[] | undefined = selectedOptions;
    if (
      (selectedOptions === undefined && fieldValue.length > 0) ||
      (Array.isArray(selectedOptions) &&
        // @ts-ignore
        selectedOptions[0].label !== fieldValue &&
        fieldValue.length > 0)
    ) {
      selectedOptionsUpdate = [{ label: fieldValue }];
    } else if (Array.isArray(selectedOptions) && fieldValue.length === 0) {
      selectedOptionsUpdate = undefined;
    }

    if (prevProps.isLoading === true && isLoading === false) {
      this.setState({
        isLoading: false,
        selectedOptions: selectedOptionsUpdate,
      });
    }

    if (!isEqual(propOptions, stateOptions)) {
      this.setState({
        options: propOptions,
      });
    }

    if (forceSelection && this.inputRef) {
      this.inputRef.focus();
    }
  }

  onChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    const options = selectedOptions.length > 0 ? selectedOptions : undefined;
    this.setState({
      selectedOptions: options,
    });

    const fieldValue =
      Array.isArray(options) && options[0].label.length > 0 ? options[0].label : '';
    this.props.entityFieldValueChanged(this.props.entity, fieldValue);
  };

  onSearchChange = (searchValue: string) => {
    this.setState({
      isLoading: true,
      options: [],
    });
    this.props.onSearchChange(this.props.entity, searchValue);
  };

  render() {
    const { entity, forceSelection } = this.props;
    const { isLoading, options, selectedOptions } = this.state;

    const control = (
      <EuiComboBox
        async
        isLoading={isLoading}
        inputRef={input => {
          if (input) {
            this.inputRef = input;
          }
        }}
        style={{ minWidth: '300px' }}
        placeholder={i18n.translate('xpack.ml.timeSeriesExplorer.enterValuePlaceholder', {
          defaultMessage: 'Enter value',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={this.onChange}
        onSearchChange={this.onSearchChange}
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
