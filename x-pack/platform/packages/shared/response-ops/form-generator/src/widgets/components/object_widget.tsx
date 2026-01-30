/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { EuiSpacer } from '@elastic/eui';
import type { BaseWidgetProps } from '../types';
import { getFieldsFromSchema, renderField } from '../../field_builder';

// This widget represents a nested object within the form. For example, given a schema like:
// z.object({
//   server: z.object({
//     host: z.string(),
//     port: z.number()
//   })
// })
//
// The ObjectWidget would render the nested 'server' object by generating fields for 'host' and 'port'
// with paths like 'server.host' and 'server.port', adding another level to the dot-notated path.

type ObjectWidgetProps = BaseWidgetProps<z.ZodObject<z.ZodRawShape>>;

export const ObjectWidget: React.FC<ObjectWidgetProps> = ({
  path: rootPath,
  schema,
  formConfig,
}) => {
  const fields = getFieldsFromSchema({
    schema,
    rootPath,
    formConfig,
  });

  return fields.map((field) => {
    return (
      <>
        {renderField({ field })}
        <EuiSpacer size="m" />
      </>
    );
  });
};
