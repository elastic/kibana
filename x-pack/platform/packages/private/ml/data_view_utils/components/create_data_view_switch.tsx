/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface CreateDataViewSwitchProps {
  canCreateDataView: boolean;
  createDataView: boolean;
  setCreateDataView: (d: boolean) => void;
}

export const CreateDataViewSwitch: FC<CreateDataViewSwitchProps> = ({
  canCreateDataView,
  createDataView,
  setCreateDataView,
}) => (
  <EuiSwitch
    name="mlCreateDataView"
    disabled={canCreateDataView === false}
    label={i18n.translate('xpack.ml.dataViewUtils.createDataViewSwitchLabel', {
      defaultMessage: 'Create data view',
    })}
    checked={createDataView === true}
    onChange={() => setCreateDataView(!createDataView)}
    data-test-subj="mlCreateDataViewSwitch"
  />
);
