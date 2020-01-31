/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JoinExpression } from './join_expression';
import { MetricsExpression } from './metrics_expression';
import { WhereExpression } from './where_expression';

import { indexPatternService } from '../../../../kibana_services';

const getIndexPatternId = props => {
  return _.get(props, 'join.right.indexPatternId');
};

export class Join extends Component {
  state = {
    leftFields: null,
    leftSourceName: '',
    rightFields: undefined,
    indexPattern: undefined,
    loadError: undefined,
    prevIndexPatternId: getIndexPatternId(this.props),
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLeftFields();
    this._loadLeftSourceName();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (!this.state.rightFields && getIndexPatternId(this.props) && !this.state.loadError) {
      this._loadRightFields(getIndexPatternId(this.props));
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextIndexPatternId = getIndexPatternId(nextProps);
    if (nextIndexPatternId !== prevState.prevIndexPatternId) {
      return {
        rightFields: undefined,
        loadError: undefined,
        prevIndexPatternId: nextIndexPatternId,
      };
    }

    return null;
  }

  async _loadRightFields(indexPatternId) {
    if (!indexPatternId) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.layerPanel.join.noIndexPatternErrorMessage', {
            defaultMessage: `Unable to find Index pattern {indexPatternId}`,
            values: { indexPatternId },
          }),
        });
      }
      return;
    }

    if (indexPatternId !== this.state.prevIndexPatternId) {
      // ignore out of order responses
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      rightFields: indexPattern.fields,
      indexPattern,
    });
  }

  async _loadLeftSourceName() {
    const leftSourceName = await this.props.layer.getSourceName();
    if (!this._isMounted) {
      return;
    }
    this.setState({ leftSourceName });
  }

  async _loadLeftFields() {
    let leftFields;
    try {
      leftFields = await this.props.layer.getLeftJoinFields();
    } catch (error) {
      leftFields = [];
    }
    if (!this._isMounted) {
      return;
    }
    this.setState({ leftFields });
  }

  _onLeftFieldChange = leftField => {
    this.props.onChange({
      leftField: leftField,
      right: this.props.join.right,
    });
  };

  _onRightSourceChange = ({ indexPatternId, indexPatternTitle }) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        id: this.props.join.right.id,
        indexPatternId,
        indexPatternTitle,
      },
    });
  };

  _onRightFieldChange = term => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        term,
      },
    });
  };

  _onMetricsChange = metrics => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        metrics,
      },
    });
  };

  _onWhereQueryChange = whereQuery => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        whereQuery,
      },
    });
  };

  render() {
    const { join, onRemove } = this.props;
    const { leftSourceName, leftFields, rightFields, indexPattern } = this.state;
    const right = _.get(join, 'right', {});
    const rightSourceName = right.indexPatternTitle
      ? right.indexPatternTitle
      : right.indexPatternId;
    const isJoinConfigComplete = join.leftField && right.indexPatternId && right.term;

    let metricsExpression;
    if (isJoinConfigComplete) {
      metricsExpression = (
        <EuiFlexItem grow={false}>
          <MetricsExpression
            metrics={right.metrics}
            rightFields={rightFields}
            onChange={this._onMetricsChange}
          />
        </EuiFlexItem>
      );
    }

    let whereExpression;
    if (indexPattern && isJoinConfigComplete) {
      whereExpression = (
        <EuiFlexItem grow={false}>
          <WhereExpression
            indexPattern={indexPattern}
            whereQuery={join.right.whereQuery}
            onChange={this._onWhereQueryChange}
          />
        </EuiFlexItem>
      );
    }

    return (
      <div className="mapJoinItem">
        <EuiFlexGroup className="mapJoinItem__inner" responsive={false} wrap={true} gutterSize="s">
          <EuiFlexItem grow={false}>
            <JoinExpression
              leftSourceName={leftSourceName}
              leftValue={join.leftField}
              leftFields={leftFields}
              onLeftFieldChange={this._onLeftFieldChange}
              rightSourceIndexPatternId={right.indexPatternId}
              rightSourceName={rightSourceName}
              onRightSourceChange={this._onRightSourceChange}
              rightValue={right.term}
              rightFields={rightFields}
              onRightFieldChange={this._onRightFieldChange}
            />
          </EuiFlexItem>

          {metricsExpression}

          {whereExpression}

          <EuiButtonIcon
            className="mapJoinItem__delete"
            iconType="trash"
            color="danger"
            aria-label={i18n.translate('xpack.maps.layerPanel.join.deleteJoinAriaLabel', {
              defaultMessage: 'Delete join',
            })}
            title={i18n.translate('xpack.maps.layerPanel.join.deleteJoinTitle', {
              defaultMessage: 'Delete join',
            })}
            onClick={onRemove}
          />
        </EuiFlexGroup>
      </div>
    );
  }
}
