/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, ChangeEvent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { ExpressionAST } from '../../../../types';

const { set, del } = immutable;

export interface Arguments {
  label: string;
  lines: number;
  bars: number;
  points: number;
}
export type Argument = keyof Arguments;

export interface Props {
  argValue: ExpressionAST;
  labels: string[];
  onValueChange: (argValue: ExpressionAST) => void;
  typeInstance?: {
    name: string;
    options: {
      include: string[];
    };
  };
}

export const ExtendedTemplate: FunctionComponent<Props> = props => {
  const { typeInstance, onValueChange, labels, argValue } = props;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const selectedSeries = get(chainArgs, 'label.0', '');

  let name = '';
  if (typeInstance) {
    name = typeInstance.name;
  }

  const fields = get<string[]>(typeInstance, 'options.include', []);
  const hasPropFields = fields.some(field => ['lines', 'bars', 'points'].indexOf(field) !== -1);

  const handleChange: <T extends Argument>(key: T, val: ChangeEvent<HTMLSelectElement>) => void = (
    argName,
    ev
  ) => {
    const fn = ev.target.value === '' ? del : set;
    const newValue = fn(argValue, `chain.0.arguments.${argName}`, [ev.target.value]);
    return onValueChange(newValue);
  };

  // TODO: add fill and stack options
  // TODO: add label name auto-complete
  const values = [
    { value: 0, text: 'None' },
    { value: 1, text: '1' },
    { value: 2, text: '2' },
    { value: 3, text: '3' },
    { value: 4, text: '4' },
    { value: 5, text: '5' },
  ];

  const labelOptions = [{ value: '', text: 'Select Series' }];
  labels.sort().forEach(val => labelOptions.push({ value: val, text: val }));

  return (
    <div>
      {name !== 'defaultStyle' && (
        <EuiFormRow label="Series Identifier" compressed>
          <EuiSelect
            value={selectedSeries}
            options={labelOptions}
            onChange={ev => handleChange('label', ev)}
          />
        </EuiFormRow>
      )}
      {hasPropFields && (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            {fields.includes('lines') && (
              <EuiFlexItem>
                <EuiFormRow label="Line" compressed>
                  <EuiSelect
                    value={get(chainArgs, 'lines.0', 0)}
                    options={values}
                    onChange={ev => handleChange('lines', ev)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
            {fields.includes('bars') && (
              <EuiFlexItem>
                <EuiFormRow label="Bar" compressed>
                  <EuiSelect
                    value={get(chainArgs, 'bars.0', 0)}
                    options={values}
                    onChange={ev => handleChange('bars', ev)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
            {fields.includes('points') && (
              <EuiFlexItem>
                <EuiFormRow label="Point" compressed>
                  <EuiSelect
                    value={get(chainArgs, 'points.0', 0)}
                    options={values}
                    onChange={ev => handleChange('points', ev)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </Fragment>
      )}
    </div>
  );
};

ExtendedTemplate.displayName = 'SeriesStyleArgAdvancedInput';

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
  labels: PropTypes.array.isRequired,
};
