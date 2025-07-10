/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';

import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';
import { DESCRIPTION_LABEL, NAME_LABEL, OPTIONAL_LABEL } from '../../../connectors/translations';

export const ConnectorNameAndDescriptionFormContent: React.FC = () => {
  const {
    localNameAndDescription: { name, description },
  } = useValues(ConnectorNameAndDescriptionLogic);
  const { updateLocalNameAndDescription } = useActions(ConnectorNameAndDescriptionLogic);

  return (
    <>
      <EuiFormRow label={NAME_LABEL}>
        <EuiFieldText
          required
          value={name ?? ''}
          onChange={(event) => {
            updateLocalNameAndDescription({ name: event.target.value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow label={DESCRIPTION_LABEL}>
        <EuiTextArea
          placeholder={OPTIONAL_LABEL}
          value={description || ''}
          onChange={(event) => {
            updateLocalNameAndDescription({ description: event.target.value });
          }}
        />
      </EuiFormRow>
    </>
  );
};
