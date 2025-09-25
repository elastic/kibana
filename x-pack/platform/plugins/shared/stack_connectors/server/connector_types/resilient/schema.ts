/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateKeysAllowed, validateRecordMaxKeys } from '../lib/validators';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  orgId: schema.string(),
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  apiKeyId: schema.string(),
  apiKeySecret: schema.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

const CommonIncidentAttributes = {
  name: schema.string(),
  description: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  incidentTypes: schema.nullable(schema.arrayOf(schema.number())),
  severityCode: schema.nullable(schema.number()),
  additionalFields: schema.nullable(
    schema.recordOf(
      schema.string({
        validate: (value) => validateOtherFieldsKeys(value),
      }),
      schema.any(),
      {
        validate: (value) =>
          validateRecordMaxKeys({
            record: value,
            maxNumberOfFields: 200,
            fieldName: 'additionalFields',
          }),
      }
    )
  ),
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonIncidentAttributes);

const validateOtherFieldsKeys = (key: string): string | undefined => {
  return validateKeysAllowed({
    key,
    disallowList: commonIncidentSchemaObjectProperties,
    fieldName: 'additionalFields',
  });
};

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    ...CommonIncidentAttributes,
  }),
  comments: schema.nullable(
    schema.arrayOf(
      schema.object({
        comment: schema.string(),
        commentId: schema.string(),
      })
    )
  ),
});

export const PushToServiceIncidentSchema = {
  name: schema.string(),
  description: schema.nullable(schema.string()),
  incidentTypes: schema.nullable(schema.arrayOf(schema.number())),
  severityCode: schema.nullable(schema.number()),
  additionalFields: schema.nullable(
    schema.recordOf(
      schema.string({
        validate: (value) => validateOtherFieldsKeys(value),
      }),
      schema.any(),
      {
        validate: (value) =>
          validateRecordMaxKeys({
            record: value,
            maxNumberOfFields: 200,
            fieldName: 'additionalFields',
          }),
      }
    )
  ),
};

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = schema.object({});
export const ExecutorSubActionGetIncidentTypesParamsSchema = schema.object({});
export const ExecutorSubActionGetSeverityParamsSchema = schema.object({});

const ArrayOfValuesSchema = schema.arrayOf(
  schema.object(
    {
      value: schema.number(),
      label: schema.string(),
    },
    { unknowns: 'allow' }
  )
);

export const GetIncidentTypesResponseSchema = schema.object(
  {
    values: ArrayOfValuesSchema,
  },
  { unknowns: 'allow' }
);

export const GetSeverityResponseSchema = schema.object(
  {
    values: ArrayOfValuesSchema,
  },
  { unknowns: 'allow' }
);

export const ExternalServiceFieldsSchema = schema.object(
  {
    input_type: schema.string(),
    name: schema.string(),
    read_only: schema.boolean(),
    required: schema.nullable(schema.string()),
    text: schema.string(),
  },
  { unknowns: 'allow' }
);

export const GetCommonFieldsResponseSchema = schema.arrayOf(ExternalServiceFieldsSchema);

export const ExternalServiceIncidentResponseSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  url: schema.string(),
  pushedDate: schema.string(),
});

export const GetIncidentResponseSchema = schema.object(
  {
    id: schema.number(),
    inc_last_modified_date: schema.number(),
  },
  { unknowns: 'allow' }
);
