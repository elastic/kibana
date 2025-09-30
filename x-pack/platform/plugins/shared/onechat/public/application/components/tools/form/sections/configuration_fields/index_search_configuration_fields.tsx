/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { IndexSearchPattern } from '../../components/index_search/index_search_pattern';
import type { IndexSearchToolFormData } from '../../types/tool_form_types';
import { i18nMessages } from '../../i18n';

export const IndexSearchConfiguration = () => {
  const {
    formState: { errors },
  } = useFormContext<IndexSearchToolFormData>();
  return (
    <EuiFormRow
      label={i18nMessages.configuration.form.indexSearch.patternLabel}
      isInvalid={!!errors.pattern}
      error={errors.pattern?.message}
    >
      <IndexSearchPattern />
    </EuiFormRow>
  );
};
