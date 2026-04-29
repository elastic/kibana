/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { get } from 'lodash';
import type { ValidationError } from '../../../../../../shared_imports';
import { useFormData, useFormContext } from '../../../../../../shared_imports';
import { ROLLOVER_FORM_PATHS } from '../../../constants';
import { ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE } from '../../../form';

const rolloverFieldPaths = Object.values(ROLLOVER_FORM_PATHS);

export const useRolloverValueRequiredValidation = (): boolean => {
  const [isValid, setIsValid] = useState(false);
  const [formData] = useFormData({ watch: rolloverFieldPaths });
  const { getFields } = useFormContext();

  useEffect(() => {
    // We check just the ROLLOVER_FORM_PATHS.maxPrimaryShardSize field because if
    // it has the ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE error, all the other rollover
    // fields should too.
    const rolloverFieldErrors: ValidationError[] =
      get(getFields(), ROLLOVER_FORM_PATHS.maxPrimaryShardSize)?.errors ?? [];

    setIsValid(
      rolloverFieldErrors.some(
        (validation) => validation.code === ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE
      )
    );
  }, [getFields, formData]);

  return isValid;
};
