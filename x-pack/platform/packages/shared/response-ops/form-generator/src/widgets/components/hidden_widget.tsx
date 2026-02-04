/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { HiddenField as FormHiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';

type HiddenWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldTextProps>;

export const HiddenWidget: React.FC<HiddenWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
}) => {
  return (
    <UseField
      path={path}
      component={FormHiddenField}
      config={fieldConfig}
      componentProps={fieldProps}
    />
  );
};
