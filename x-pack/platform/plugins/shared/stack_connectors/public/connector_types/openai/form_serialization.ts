/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema, InternalConnectorForm } from '@kbn/alerts-ui-shared';
import { isEmpty } from 'lodash';

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
