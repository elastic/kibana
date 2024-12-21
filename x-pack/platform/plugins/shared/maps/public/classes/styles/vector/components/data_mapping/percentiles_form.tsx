/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RowActionButtons } from '../row_action_buttons';

interface Props {
  initialPercentiles: number[];
  onChange: (percentiles: number[]) => void;
}

interface State {
  percentiles: Array<number | string>;
}

function isInvalidPercentile(percentile: unknown) {
  if (typeof percentile !== 'number') {
    return true;
  }

  return percentile <= 0 || percentile >= 100;
}

export class PercentilesForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      percentiles: props.initialPercentiles,
    };
  }

  _onSubmit = () => {
    const hasInvalidPercentile = this.state.percentiles.some(isInvalidPercentile);
    if (!hasInvalidPercentile) {
      this.props.onChange(this.state.percentiles as number[]);
    }
  };

  render() {
    const rows = this.state.percentiles.map((percentile: number | string, index: number) => {
      const onAdd = () => {
        let newPercentile: number | string = '';
        if (typeof percentile === 'number') {
          let delta = 1;
          if (index === this.state.percentiles.length - 1) {
            // Adding row to end of list.
            if (index !== 0) {
              const prevPercentile = this.state.percentiles[index - 1];
              if (typeof prevPercentile === 'number') {
                delta = percentile - prevPercentile;
              }
            }
          } else {
            // Adding row in middle of list.
            const nextPercentile = this.state.percentiles[index + 1];
            if (typeof nextPercentile === 'number') {
              delta = (nextPercentile - percentile) / 2;
            }
          }
          newPercentile = percentile + delta;
          if (newPercentile >= 100) {
            newPercentile = 99;
          }
        }

        const percentiles = [
          ...this.state.percentiles.slice(0, index + 1),
          newPercentile,
          ...this.state.percentiles.slice(index + 1),
        ];
        this.setState({ percentiles }, this._onSubmit);
      };

      const onRemove = () => {
        const percentiles =
          this.state.percentiles.length === 1
            ? this.state.percentiles
            : [
                ...this.state.percentiles.slice(0, index),
                ...this.state.percentiles.slice(index + 1),
              ];
        this.setState({ percentiles }, this._onSubmit);
      };

      const onPercentileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = parseFloat(event.target.value);
        const percentiles = [...this.state.percentiles];
        percentiles[index] = isNaN(sanitizedValue) ? '' : sanitizedValue;
        this.setState({ percentiles }, this._onSubmit);
      };

      const isInvalid = isInvalidPercentile(percentile);
      const error = isInvalid
        ? i18n.translate('xpack.maps.styles.invalidPercentileMsg', {
            defaultMessage: `Percentile must be a number between 0 and 100, exclusive`,
          })
        : null;

      return (
        <EuiFormRow key={index} display="rowCompressed" isInvalid={isInvalid} error={error}>
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={percentile}
            onChange={onPercentileChange}
            append={
              <RowActionButtons
                onAdd={onAdd}
                onRemove={onRemove}
                showDeleteButton={this.state.percentiles.length > 1}
              />
            }
            compressed
          />
        </EuiFormRow>
      );
    });

    return <div>{rows}</div>;
  }
}
