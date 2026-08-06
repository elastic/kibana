/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import { EuiSuperSelect } from '@elastic/eui';

import { FieldTypeWithIcon } from './field_type_with_icon';
import { INFERRED_FIELD_TYPE_OPTIONS } from './inferred_field_type_options';

export const FieldTypeSuperSelect: FunctionComponent<
  Omit<EuiSuperSelectProps<string>, 'options' | 'onChange'> & {
    inferredType: string;
    onChange: (nextType: string) => void;
  }
> = ({ inferredType, onChange, valueOfSelected, ...props }) => {
  const options = useMemo(() => {
    return INFERRED_FIELD_TYPE_OPTIONS.map((type) => {
      const isSelectedAutoDetected =
        type === valueOfSelected && type === inferredType && valueOfSelected === inferredType;

      return {
        value: type,
        inputDisplay: (
          <FieldTypeWithIcon
            type={type}
            fillWidth
            showAutoDetectedSuffix={isSelectedAutoDetected}
          />
        ),
        dropdownDisplay: <FieldTypeWithIcon type={type} />,
      };
    });
  }, [inferredType, valueOfSelected]);

  return (
    <EuiSuperSelect
      {...props}
      compressed
      valueOfSelected={valueOfSelected}
      options={options}
      onChange={onChange}
      itemLayoutAlign="top"
    />
  );
};
