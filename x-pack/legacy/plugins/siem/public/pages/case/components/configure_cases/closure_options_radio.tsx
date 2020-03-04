/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiRadioGroup } from '@elastic/eui';

import * as i18n from './translations';

const ID_PREFIX = 'closure_options';
const DEFAULT_RADIO = `${ID_PREFIX}_manual`;

const radios = [
  {
    id: DEFAULT_RADIO,
    label: i18n.CASE_CLOSURE_OPTIONS_MANUAL,
  },
  {
    id: `${ID_PREFIX}_new_incident`,
    label: i18n.CASE_CLOSURE_OPTIONS_NEW_INCIDENT,
  },
  {
    id: `${ID_PREFIX}_closed_incident`,
    label: i18n.CASE_CLOSURE_OPTIONS_CLOSED_INCIDENT,
  },
];

const ClosureOptionsRadioComponent: React.FC = () => {
  const [selectedClosure, setSelectedClosure] = useState(DEFAULT_RADIO);

  return (
    <EuiRadioGroup
      options={radios}
      idSelected={selectedClosure}
      onChange={setSelectedClosure}
      name="closure_options"
    />
  );
};

export const ClosureOptionsRadio = React.memo(ClosureOptionsRadioComponent);
