/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { CaseConfigureClosureType } from '../../../../containers/case/configure/types';
import { ClosureOptionsRadio } from './closure_options_radio';
import * as i18n from './translations';

interface ClosureOptionsProps {
  closureTypeSelected: CaseConfigureClosureType;
  disabled: boolean;
  onChangeClosureType: (newClosureType: CaseConfigureClosureType) => void;
}

const ClosureOptionsComponent: React.FC<ClosureOptionsProps> = ({
  closureTypeSelected,
  disabled,
  onChangeClosureType,
}) => {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.CASE_CLOSURE_OPTIONS_TITLE}</h3>}
      description={i18n.CASE_CLOSURE_OPTIONS_DESC}
    >
      <EuiFormRow fullWidth label={i18n.CASE_CLOSURE_OPTIONS_LABEL}>
        <ClosureOptionsRadio
          closureTypeSelected={closureTypeSelected}
          disabled={disabled}
          onChangeClosureType={onChangeClosureType}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

export const ClosureOptions = React.memo(ClosureOptionsComponent);
