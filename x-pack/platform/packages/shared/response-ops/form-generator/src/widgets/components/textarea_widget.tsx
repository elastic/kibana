/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTextAreaProps } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { TextAreaField as FormTextAreaField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';

type TextareaWidgetProps = BaseWidgetProps<z.ZodString, EuiTextAreaProps>;

const DEFAULT_ROWS = 6;

export const TextareaWidget: React.FC<TextareaWidgetProps> = ({
  path,
  fieldProps,
  fieldConfig,
}) => {
  return (
    <UseField
      path={path}
      component={FormTextAreaField}
      config={fieldConfig}
      componentProps={{
        ...fieldProps,
        euiFieldProps: {
          rows: DEFAULT_ROWS,
          // Monospace surfaces PEM structure better than the default proportional font.
          style: { fontFamily: 'monospace' },
          ...fieldProps?.euiFieldProps,
        },
      }}
    />
  );
};
