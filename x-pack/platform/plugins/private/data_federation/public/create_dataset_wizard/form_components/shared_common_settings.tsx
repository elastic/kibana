/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Control } from 'react-hook-form';

import type { CreateDatasetFormValues } from '../create_dataset_form_state';

export function SharedCommonSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return <div data-test-subj="createDatasetSharedCommonSettings" />;
}
