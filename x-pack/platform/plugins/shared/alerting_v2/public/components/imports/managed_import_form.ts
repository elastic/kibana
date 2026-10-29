/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateManagedImportData } from '@kbn/alerting-v2-schemas';

export interface ManagedImportFormState {
  name: string;
  description: string;
  tags: string[];
  routingTags: string[];
  owner: string;
}

export const DEFAULT_MANAGED_IMPORT_FORM_STATE: ManagedImportFormState = {
  name: '',
  description: '',
  tags: [],
  routingTags: [],
  owner: '',
};

/** Drops empty optional values so the request only carries what the user filled in. */
export const toCreateManagedImportData = ({
  connectorId,
  values,
}: {
  connectorId: string;
  values: ManagedImportFormState;
}): CreateManagedImportData => {
  const name = values.name.trim();
  const description = values.description.trim();
  const owner = values.owner.trim();

  return {
    kind: 'managed',
    connector_id: connectorId,
    ...(name !== '' ? { name } : {}),
    ...(description !== '' ? { description } : {}),
    ...(values.tags.length > 0 ? { tags: values.tags } : {}),
    ...(values.routingTags.length > 0 ? { routing_tags: values.routingTags } : {}),
    ...(owner !== '' ? { owner } : {}),
  };
};
