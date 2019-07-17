/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import { EuiForm } from '@elastic/eui';
import { SlmPolicy, SlmPolicyPayload } from '../../../../common/types';

interface Props {
  policy: SlmPolicyPayload;
  isEditing?: boolean;
  isSaving: boolean;
  saveError?: React.ReactNode;
  clearSaveError: () => void;
  onSave: (policy: SlmPolicy) => void;
}

export const PolicyForm: React.FunctionComponent<Props> = ({
  policy,
  isEditing,
  isSaving,
  saveError,
  clearSaveError,
  onSave,
}) => {
  return <EuiForm>a form</EuiForm>;
};
