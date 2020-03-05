/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import * as i18n from './translations';
import { ClosureOptionsRadio } from './closure_options_radio';

const ClosureOptionsComponent: React.FC = () => {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.CASE_CLOSURE_OPTIONS_TITLE}</h3>}
      description={i18n.CASE_CLOSURE_OPTIONS_DESC}
    >
      <EuiFormRow fullWidth label={i18n.CASE_CLOSURE_OPTIONS_LABEL}>
        <ClosureOptionsRadio />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

export const ClosureOptions = React.memo(ClosureOptionsComponent);
