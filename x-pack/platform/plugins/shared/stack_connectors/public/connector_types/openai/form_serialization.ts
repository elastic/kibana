/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema, InternalConnectorForm } from '@kbn/alerts-ui-shared';
import { isEmpty } from 'lodash';

// Same as the webhook-type connectors (../lib/webhook/form_serialization.ts),
// but might diverge in the future
export const formDeserializer = (data: ConnectorFormSchema): InternalConnectorForm => {
  if (!data.actionTypeId) {
    // Hook form lib can call deserializer *also* while editing the form (indicated by actionTypeId
    // still being undefined). Changing the reference of form data subproperties causes problems
    // with the UseArray that is used to edit the headers. For this reason, we leave the data unchanged.
    return data;
  }

  const configHeaders = Object.entries(data?.config?.headers ?? {}).map(([key, value]) => ({
    key,
    value,
    type: 'config' as const,
  }));

  return {
    ...data,
    config: {
      ...data.config,
      headers: isEmpty(configHeaders) ? undefined : configHeaders,
    },
    __internal__: {
      headers: configHeaders,
    },
  };
};

export const formSerializer = (formData: InternalConnectorForm): ConnectorFormSchema => {
  const webhookFormData = formData as {
    config: { headers?: Array<{ key: string; value: string }> };
  };

  const configHeaders = (webhookFormData?.config?.headers ?? []).reduce(
    (acc, header) => ({
      ...acc,
      [header.key]: header.value,
    }),
    {}
  );

  return {
    ...formData,
    config: {
      ...formData.config,
      headers: isEmpty(configHeaders) ? undefined : configHeaders,
    },
    secrets: {
      ...formData.secrets,
      secretHeaders: undefined,
    },
  };
};
