/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { NumericField as FormNumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';

type NumberWidgetProps = BaseWidgetProps<z.ZodNumber, EuiFieldNumberProps>;

const numberSerializer = (v: unknown) => {
  if (typeof v === 'string') {
    if (v === '') return undefined;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return v;
};

export const NumberWidget: React.FC<NumberWidgetProps> = ({ path, fieldProps, fieldConfig }) => (
  <UseField
    path={path}
    component={FormNumericField}
    config={{ serializer: numberSerializer, ...fieldConfig }}
    componentProps={fieldProps}
  />
);
