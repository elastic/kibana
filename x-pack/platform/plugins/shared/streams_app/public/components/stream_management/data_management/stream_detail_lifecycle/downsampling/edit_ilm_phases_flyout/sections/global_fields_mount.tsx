/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useOnFieldErrorsChange } from '../form';

export const GlobalFieldsMount = () => {
  const onFieldErrorsChange = useOnFieldErrorsChange();
  return (
    <UseField
      path="_meta.searchableSnapshot.repository"
      onError={(errors) => onFieldErrorsChange?.('_meta.searchableSnapshot.repository', errors)}
    >
      {() => null}
    </UseField>
  );
};
