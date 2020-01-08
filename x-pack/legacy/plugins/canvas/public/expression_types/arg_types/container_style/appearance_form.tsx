/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { ArgTypesStrings } from '../../../../i18n';

const { ContainerStyle: strings } = ArgTypesStrings;
type Overflow = 'hidden' | 'visible';

export interface Arguments {
  padding: string | number;
  opacity: string | number;
  overflow: Overflow;
}
export type ArgumentTypes = Arguments;
export type Argument = keyof Arguments;

interface Props extends Arguments {
  onChange: <T extends Argument>(arg: T, val: ArgumentTypes[T]) => void;
}

const overflows: Array<{ value: Overflow; text: string }> = [
  { value: 'hidden', text: strings.getOverflowHiddenOption() },
  { value: 'visible', text: strings.getOverflowVisibleOption() },
];

const opacities = [
  { value: 1, text: '100%' },
  { value: 0.9, text: '90%' },
  { value: 0.7, text: '70%' },
  { value: 0.5, text: '50%' },
  { value: 0.3, text: '30%' },
  { value: 0.1, text: '10%' },
];

export const AppearanceForm: FunctionComponent<Props> = ({
  padding = '',
  opacity = 1,
  overflow = 'hidden',
  onChange,
}) => {
  if (typeof padding === 'string') {
    padding = padding.replace('px', '');
  }

  const namedChange = (name: keyof Arguments) => (
    ev: ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    if (name === 'padding') {
      return onChange(name, `${ev.target.value}px`);
    }

    onChange(name, ev.target.value);
  };

  return (
    <EuiFlexGroup gutterSize="s" justify-content="spaceBetween">
      <EuiFlexItem grow={2}>
        <EuiFormRow label={strings.getPaddingLabel()} display="rowCompressed">
          <EuiFieldNumber compressed value={Number(padding)} onChange={namedChange('padding')} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiFormRow label={strings.getOpacityLabel()} display="rowCompressed">
          <EuiSelect
            compressed
            value={opacity}
            options={opacities}
            onChange={namedChange('opacity')}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiFormRow label={strings.getOverflowLabel()} display="rowCompressed">
          <EuiSelect
            compressed
            value={overflow}
            options={overflows}
            onChange={namedChange('overflow')}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AppearanceForm.propTypes = {
  padding: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  opacity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  overflow: PropTypes.oneOf(['hidden', 'visible']),
  onChange: PropTypes.func.isRequired,
};

AppearanceForm.defaultProps = {
  opacity: 1,
  overflow: 'hidden',
};
