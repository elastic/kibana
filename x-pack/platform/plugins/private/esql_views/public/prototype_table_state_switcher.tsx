/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePrototypeTableState } from './services/use_prototype_table_state';
import type { PrototypeTableState } from './services/prototype_table_state_store';

const OPTIONS: Array<{ id: PrototypeTableState; label: string }> = [
  {
    id: 'empty',
    label: i18n.translate('esqlViews.prototypeTableState.empty', { defaultMessage: 'Empty' }),
  },
  {
    id: 'filled',
    label: i18n.translate('esqlViews.prototypeTableState.filled', { defaultMessage: 'Filled' }),
  },
];

export const PrototypeTableStateSwitcher: React.FunctionComponent = () => {
  const [tableState, setTableState] = usePrototypeTableState();

  return (
    <EuiButtonGroup
      legend={i18n.translate('esqlViews.prototypeTableStateSwitcher.legend', {
        defaultMessage: 'Table preview',
      })}
      options={OPTIONS}
      idSelected={tableState}
      onChange={(id) => setTableState(id as PrototypeTableState)}
      buttonSize="compressed"
      data-test-subj="esqlViewsPrototypeTableStateSwitcher"
    />
  );
};
