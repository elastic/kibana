/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiComboBox,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';

function getEntityControlOptions(entity) {
  if (!Array.isArray(entity.fieldValues)) {
    return [];
  }

  return entity.fieldValues.map((value) => {
    return { label: value };
  });
}

export const EntityControl = injectI18n(
  class EntityControl extends React.Component {
    static propTypes = {
      entity: PropTypes.object.isRequired,
      entityFieldValueChanged: PropTypes.func.isRequired,
    };

    state = {
      selectedOptions: undefined
    }

    constructor(props) {
      super(props);
    }

    componentDidUpdate() {
      const { entity } = this.props;
      const { selectedOptions } = this.state;

      const fieldValue = entity.fieldValue;

      if (
        (selectedOptions === undefined && fieldValue !== undefined) ||
        (Array.isArray(selectedOptions) && fieldValue !== undefined && selectedOptions[0].label !== fieldValue)
      ) {
        this.setState({
          selectedOptions: [{ label: fieldValue }]
        });
      }
    }

    onChange = (selectedOptions) => {
      this.setState({
        selectedOptions: selectedOptions,
      });
      this.props.entityFieldValueChanged(this.props.entity, selectedOptions[0].label);
    };

    render() {
      const { entity, intl } = this.props;
      const { selectedOptions } = this.state;
      const options = getEntityControlOptions(entity);

      return (
        <EuiFlexItem grow={false}>
          <EuiFormRow label={entity.fieldName}>
            <EuiComboBox
              placeholder={intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.enterValuePlaceholder',
                defaultMessage: 'Enter value'
              })}
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={selectedOptions}
              onChange={this.onChange}
              isClearable={false}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }
  }
);
