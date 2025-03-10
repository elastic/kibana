/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { AGG_TYPE } from '../../../../common/constants';
import { AggDescriptor, FieldedAggDescriptor } from '../../../../common/descriptor_types';
import { MaskEditor } from './mask_editor';
import { getAggDisplayName } from '../../../classes/sources/es_agg_source';
import {
  getMaskI18nDescription,
  getMaskI18nValue,
} from '../../../classes/layers/vector_layer/mask';

interface Props {
  fields: DataViewField[];
  isJoin: boolean;
  metric: AggDescriptor;
  onChange: (metric: AggDescriptor) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class MaskExpression extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _getMaskExpressionValue() {
    return this.props.metric.mask === undefined
      ? '...'
      : getMaskI18nValue(this.props.metric.mask.operator, this.props.metric.mask.value);
  }

  _getAggLabel() {
    const aggDisplayName = getAggDisplayName(this.props.metric.type);
    if (this.props.metric.type === AGG_TYPE.COUNT || this.props.metric.field === undefined) {
      return aggDisplayName;
    }

    const targetField = this.props.fields.find(
      (field) => field.name === (this.props.metric as FieldedAggDescriptor).field
    );
    const fieldDisplayName = targetField?.displayName
      ? targetField?.displayName
      : this.props.metric.field;
    return `${aggDisplayName} ${fieldDisplayName}`;
  }

  render() {
    // masks only supported for numerical metrics
    if (this.props.metric.type === AGG_TYPE.TERMS) {
      return null;
    }

    return (
      <EuiPopover
        id="mask"
        button={
          <EuiExpression
            color="subdued"
            description={getMaskI18nDescription({
              aggLabel: this._getAggLabel(),
              isJoin: this.props.isJoin,
            })}
            value={this._getMaskExpressionValue()}
            onClick={this._togglePopover}
            uppercase={false}
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="s"
        anchorPosition="downCenter"
        repositionOnScroll={true}
      >
        <MaskEditor
          metric={this.props.metric}
          onChange={this.props.onChange}
          onClose={this._closePopover}
        />
      </EuiPopover>
    );
  }
}
