/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFormRow, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CreateDataViewSwitch } from './create_data_view_switch';
import { CreateDataViewTimeField } from './create_data_view_time_field';

interface CreateDataViewFormProps {
  canCreateDataView: boolean;
  createDataView: boolean;
  dataViewTitleExists: boolean;
  setCreateDataView: (d: boolean) => void;
  dataViewAvailableTimeFields: string[];
  dataViewTimeField: string | undefined;
  onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const CreateDataViewForm: FC<CreateDataViewFormProps> = ({
  canCreateDataView,
  createDataView,
  dataViewTitleExists,
  setCreateDataView,
  dataViewAvailableTimeFields,
  dataViewTimeField,
  onTimeFieldChanged,
}) => (
  <>
    <EuiFormRow
      isInvalid={(createDataView && dataViewTitleExists) || canCreateDataView === false}
      error={[
        ...(canCreateDataView === false
          ? [
              <EuiText size="xs" color="warning">
                {i18n.translate('xpack.ml.dataViewUtils.dataViewPermissionWarning', {
                  defaultMessage: 'You need permission to create data views.',
                })}
              </EuiText>,
            ]
          : []),
        ...(createDataView && dataViewTitleExists
          ? [
              i18n.translate('xpack.ml.dataViewUtils.dataViewTitleError', {
                defaultMessage: 'A data view with this title already exists.',
              }),
            ]
          : []),
      ]}
    >
      <CreateDataViewSwitch
        canCreateDataView={canCreateDataView}
        createDataView={createDataView}
        setCreateDataView={setCreateDataView}
      />
    </EuiFormRow>
    {createDataView && !dataViewTitleExists && dataViewAvailableTimeFields.length > 0 && (
      <CreateDataViewTimeField
        dataViewAvailableTimeFields={dataViewAvailableTimeFields}
        dataViewTimeField={dataViewTimeField}
        onTimeFieldChanged={onTimeFieldChanged}
      />
    )}
  </>
);
