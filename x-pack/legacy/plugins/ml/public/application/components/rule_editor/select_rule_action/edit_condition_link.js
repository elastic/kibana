/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for quick edit of the numeric condition part of a rule,
 * containing a number field input for editing the condition value.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import { APPLIES_TO } from '../../../../../common/constants/detector_rule';
import { formatValue } from '../../../formatters/format_value';
import {
  getAppliesToValueFromAnomaly,
} from '../utils';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const EditConditionLink = injectI18n(class EditConditionLink extends Component {
  static propTypes = {
    conditionIndex: PropTypes.number.isRequired,
    conditionValue: PropTypes.number.isRequired,
    appliesTo: PropTypes.oneOf([
      APPLIES_TO.ACTUAL,
      APPLIES_TO.TYPICAL,
      APPLIES_TO.DIFF_FROM_TYPICAL
    ]),
    anomaly: PropTypes.object.isRequired,
    updateConditionValue: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    // Initialize value to anomaly value, if it exists.
    // Do rounding at this initialization stage. Then if the user
    // really wants to define to higher precision they can.
    // Format based on magnitude of value at this stage, rather than using the
    // Kibana field formatter (if set) which would add complexity converting
    // the entered value to / from e.g. bytes.
    let value = '';
    const anomaly = this.props.anomaly;
    const anomalyValue = getAppliesToValueFromAnomaly(anomaly, props.appliesTo);
    if (anomalyValue !== undefined) {
      value = +formatValue(anomalyValue, anomaly.source.function);
    }

    this.state = { value };
  }

  onChangeValue = (event) => {
    const enteredValue = event.target.value;
    this.setState({
      value: (enteredValue !== '') ? +enteredValue : '',
    });
  }

  onUpdateClick = () => {
    const { conditionIndex, updateConditionValue } = this.props;
    updateConditionValue(conditionIndex, this.state.value);
  }

  render() {
    const { intl } = this.props;
    const value = this.state.value;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="xpack.ml.ruleEditor.editConditionLink.updateRuleConditionFromText"
              defaultMessage="Update rule condition from {conditionValue} to"
              values={{ conditionValue: this.props.conditionValue }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="condition-edit-value-field">
          <EuiFieldNumber
            placeholder={intl.formatMessage({
              id: 'xpack.ml.ruleEditor.editConditionLink.enterValuePlaceholder',
              defaultMessage: 'Enter value'
            })}
            compressed={true}
            value={value}
            onChange={this.onChangeValue}
            aria-label={intl.formatMessage({
              id: 'xpack.ml.ruleEditor.editConditionLink.enterNumericValueForConditionAriaLabel',
              defaultMessage: 'Enter numeric value for condition'
            })}
          />
        </EuiFlexItem>
        {value !== '' &&
          <EuiFlexItem grow={false}>
            <EuiLink
              size="s"
              onClick={() => this.onUpdateClick()}
            >
              <FormattedMessage
                id="xpack.ml.ruleEditor.editConditionLink.updateLinkText"
                defaultMessage="Update"
              />
            </EuiLink>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
});
