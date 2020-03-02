/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { EuiRadioGroup } from '@elastic/eui';

import * as i18n from './translations';

const idPrefix = 'closure_options';
const defaultRadio = `${idPrefix}_manual`;

const radios = [
  {
    id: defaultRadio,
    label: i18n.CASE_CLOSURE_OPTIONS_MANUAL,
  },
  {
    id: `${idPrefix}_new_incident`,
    label: i18n.CASE_CLOSURE_OPTIONS_NEW_INCIDENT,
  },
  {
    id: `${idPrefix}_closed_incident`,
    label: i18n.CASE_CLOSURE_OPTIONS_CLOSED_INCIDENT,
  },
];

const ClosureOptionsRadioComponent: React.FC = () => {
  const [selectedClosure, selectClosure] = useState(defaultRadio);
  const onChange = useCallback(option => selectClosure(option), [selectedClosure]);

  return (
    <EuiRadioGroup
      options={radios}
      idSelected={selectedClosure}
      onChange={onChange}
      name="closure_options"
    />
  );
};

export const ClosureOptionsRadio = React.memo(ClosureOptionsRadioComponent);
