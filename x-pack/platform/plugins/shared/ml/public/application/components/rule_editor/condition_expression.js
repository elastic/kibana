/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a rule condition numerical expression.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiButtonIcon,
  EuiExpression,
  EuiPopoverTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiSelect,
  EuiFieldNumber,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_DETECTOR_RULE_APPLIES_TO, ML_DETECTOR_RULE_OPERATOR } from '@kbn/ml-anomaly-utils';

import { appliesToText, operatorToText } from './utils';

export class ConditionExpression extends Component {
  static propTypes = {
    index: PropTypes.number.isRequired,
    appliesTo: PropTypes.oneOf([
      ML_DETECTOR_RULE_APPLIES_TO.ACTUAL,
      ML_DETECTOR_RULE_APPLIES_TO.TYPICAL,
      ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL,
    ]),
    operator: PropTypes.oneOf([
      ML_DETECTOR_RULE_OPERATOR.LESS_THAN,
      ML_DETECTOR_RULE_OPERATOR.LESS_THAN_OR_EQUAL,
      ML_DETECTOR_RULE_OPERATOR.GREATER_THAN,
      ML_DETECTOR_RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    ]),
    value: PropTypes.number.isRequired,
    updateCondition: PropTypes.func.isRequired,
    deleteCondition: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      isAppliesToOpen: false,
      isOperatorValueOpen: false,
    };
  }

  openAppliesTo = () => {
    this.setState({
      isAppliesToOpen: true,
      isOperatorValueOpen: false,
    });
  };

  closeAppliesTo = () => {
    this.setState({
      isAppliesToOpen: false,
    });
  };

  openOperatorValue = () => {
    this.setState({
      isAppliesToOpen: false,
      isOperatorValueOpen: true,
    });
  };

  closeOperatorValue = () => {
    this.setState({
      isOperatorValueOpen: false,
    });
  };

  changeAppliesTo = (event) => {
    const { index, operator, value, updateCondition } = this.props;
    updateCondition(index, event.target.value, operator, value);
  };

  changeOperator = (event) => {
    const { index, appliesTo, value, updateCondition } = this.props;
    updateCondition(index, appliesTo, event.target.value, value);
  };

  changeValue = (event) => {
    const { index, appliesTo, operator, updateCondition } = this.props;
    updateCondition(index, appliesTo, operator, +event.target.value);
  };

  renderAppliesToPopover() {
    return (
      <div>
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.ml.ruleEditor.conditionExpression.appliesToPopoverTitle"
            defaultMessage="When"
          />
        </EuiPopoverTitle>
        <div className="euiExpression" style={{ width: 200 }}>
          <EuiSelect
            value={this.props.appliesTo}
            onChange={this.changeAppliesTo}
            options={[
              {
                value: ML_DETECTOR_RULE_APPLIES_TO.ACTUAL,
                text: appliesToText(ML_DETECTOR_RULE_APPLIES_TO.ACTUAL),
              },
              {
                value: ML_DETECTOR_RULE_APPLIES_TO.TYPICAL,
                text: appliesToText(ML_DETECTOR_RULE_APPLIES_TO.TYPICAL),
              },
              {
                value: ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL,
                text: appliesToText(ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL),
              },
            ]}
          />
        </div>
      </div>
    );
  }

  renderOperatorValuePopover() {
    return (
      <div>
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.ml.ruleEditor.conditionExpression.operatorValuePopoverTitle"
            defaultMessage="Is"
          />
        </EuiPopoverTitle>
        <div className="euiExpression">
          <EuiFlexGroup style={{ maxWidth: 450 }}>
            <EuiFlexItem grow={false} style={{ width: 250 }}>
              <EuiSelect
                value={this.props.operator}
                onChange={this.changeOperator}
                options={[
                  {
                    value: ML_DETECTOR_RULE_OPERATOR.LESS_THAN,
                    text: operatorToText(ML_DETECTOR_RULE_OPERATOR.LESS_THAN),
                  },
                  {
                    value: ML_DETECTOR_RULE_OPERATOR.LESS_THAN_OR_EQUAL,
                    text: operatorToText(ML_DETECTOR_RULE_OPERATOR.LESS_THAN_OR_EQUAL),
                  },
                  {
                    value: ML_DETECTOR_RULE_OPERATOR.GREATER_THAN,
                    text: operatorToText(ML_DETECTOR_RULE_OPERATOR.GREATER_THAN),
                  },
                  {
                    value: ML_DETECTOR_RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
                    text: operatorToText(ML_DETECTOR_RULE_OPERATOR.GREATER_THAN_OR_EQUAL),
                  },
                ]}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} style={{ width: 200 }}>
              <EuiFieldNumber value={+this.props.value} onChange={this.changeValue} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  render() {
    const { index, appliesTo, operator, value, deleteCondition } = this.props;

    return (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="appliesToPopover"
            button={
              <EuiExpression
                description={
                  <FormattedMessage
                    id="xpack.ml.ruleEditor.conditionExpression.appliesToButtonLabel"
                    defaultMessage="when"
                  />
                }
                value={appliesToText(appliesTo)}
                isActive={this.state.isAppliesToOpen}
                onClick={this.openAppliesTo}
              />
            }
            isOpen={this.state.isAppliesToOpen}
            closePopover={this.closeAppliesTo}
            panelPaddingSize="s"
            ownFocus
            anchorPosition="downLeft"
          >
            {this.renderAppliesToPopover()}
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            id="operatorValuePopover"
            button={
              <EuiExpression
                description={
                  <FormattedMessage
                    id="xpack.ml.ruleEditor.conditionExpression.operatorValueButtonLabel"
                    defaultMessage="is {operator}"
                    values={{ operator: operatorToText(operator) }}
                  />
                }
                value={`${value}`}
                isActive={this.state.isOperatorValueOpen}
                onClick={this.openOperatorValue}
              />
            }
            isOpen={this.state.isOperatorValueOpen}
            closePopover={this.closeOperatorValue}
            panelPaddingSize="s"
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            {this.renderOperatorValuePopover()}
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="s"
            color="danger"
            onClick={() => deleteCondition(index)}
            iconType="trash"
            aria-label={i18n.translate(
              'xpack.ml.ruleEditor.conditionExpression.deleteConditionButtonAriaLabel',
              {
                defaultMessage: 'Delete condition',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
