/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering a rule condition numerical expression.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

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

import { APPLIES_TO, OPERATOR } from '../../../../common/constants/detector_rule';
import { appliesToText, operatorToText } from './utils';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

// Raise the popovers above GuidePageSideNav
const POPOVER_STYLE = { zIndex: '200' };


export const ConditionExpression = injectI18n(class ConditionExpression extends Component {
  static propTypes = {
    index: PropTypes.number.isRequired,
    appliesTo: PropTypes.oneOf([
      APPLIES_TO.ACTUAL,
      APPLIES_TO.TYPICAL,
      APPLIES_TO.DIFF_FROM_TYPICAL
    ]),
    operator: PropTypes.oneOf([
      OPERATOR.LESS_THAN,
      OPERATOR.LESS_THAN_OR_EQUAL,
      OPERATOR.GREATER_THAN,
      OPERATOR.GREATER_THAN_OR_EQUAL
    ]),
    value: PropTypes.number.isRequired,
    updateCondition: PropTypes.func.isRequired,
    deleteCondition: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      isAppliesToOpen: false,
      isOperatorValueOpen: false
    };
  }

  openAppliesTo = () => {
    this.setState({
      isAppliesToOpen: true,
      isOperatorValueOpen: false
    });
  };

  closeAppliesTo = () => {
    this.setState({
      isAppliesToOpen: false
    });
  };

  openOperatorValue = () => {
    this.setState({
      isAppliesToOpen: false,
      isOperatorValueOpen: true
    });
  };

  closeOperatorValue = () => {
    this.setState({
      isOperatorValueOpen: false
    });
  };

  changeAppliesTo = (event) => {
    const {
      index,
      operator,
      value,
      updateCondition } = this.props;
    updateCondition(index, event.target.value, operator, value);
  }

  changeOperator = (event) => {
    const {
      index,
      appliesTo,
      value,
      updateCondition } = this.props;
    updateCondition(index, appliesTo, event.target.value, value);
  }

  changeValue = (event) => {
    const {
      index,
      appliesTo,
      operator,
      updateCondition } = this.props;
    updateCondition(index, appliesTo, operator, +event.target.value);
  }

  renderAppliesToPopover() {
    return (
      <div style={POPOVER_STYLE}>
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
              { value: APPLIES_TO.ACTUAL, text: appliesToText(APPLIES_TO.ACTUAL) },
              { value: APPLIES_TO.TYPICAL, text: appliesToText(APPLIES_TO.TYPICAL) },
              { value: APPLIES_TO.DIFF_FROM_TYPICAL, text: appliesToText(APPLIES_TO.DIFF_FROM_TYPICAL) }
            ]}
          />
        </div>
      </div>
    );
  }

  renderOperatorValuePopover() {
    return (
      <div style={POPOVER_STYLE}>
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
                  { value: OPERATOR.LESS_THAN, text: operatorToText(OPERATOR.LESS_THAN) },
                  { value: OPERATOR.LESS_THAN_OR_EQUAL, text: operatorToText(OPERATOR.LESS_THAN_OR_EQUAL) },
                  { value: OPERATOR.GREATER_THAN, text: operatorToText(OPERATOR.GREATER_THAN) },
                  { value: OPERATOR.GREATER_THAN_OR_EQUAL, text: operatorToText(OPERATOR.GREATER_THAN_OR_EQUAL) }
                ]}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} style={{ width: 200 }}>
              <EuiFieldNumber
                value={+this.props.value}
                onChange={this.changeValue}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  render() {
    const {
      index,
      appliesTo,
      operator,
      value,
      deleteCondition
    } = this.props;

    return (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="appliesToPopover"
            button={(
              <EuiExpression
                description={(<FormattedMessage
                  id="xpack.ml.ruleEditor.conditionExpression.appliesToButtonLabel"
                  defaultMessage="when"
                />)}
                value={appliesToText(appliesTo)}
                isActive={this.state.isAppliesToOpen}
                onClick={this.openAppliesTo}
              />
            )}
            isOpen={this.state.isAppliesToOpen}
            closePopover={this.closeAppliesTo}
            panelPaddingSize="none"
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            {this.renderAppliesToPopover()}
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            id="operatorValuePopover"
            button={(
              <EuiExpression
                description={(<FormattedMessage
                  id="xpack.ml.ruleEditor.conditionExpression.operatorValueButtonLabel"
                  defaultMessage="is {operator}"
                  values={{ operator: operatorToText(operator) }}
                />)}
                value={`${value}`}
                isActive={this.state.isOperatorValueOpen}
                onClick={this.openOperatorValue}
              />
            )}
            isOpen={this.state.isOperatorValueOpen}
            closePopover={this.closeOperatorValue}
            panelPaddingSize="none"
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
            aria-label={this.props.intl.formatMessage({
              id: 'xpack.ml.ruleEditor.conditionExpression.deleteConditionButtonAriaLabel',
              defaultMessage: 'Delete condition'
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
});
