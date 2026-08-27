/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';

const SO_TYPE = 'nightshift-investigation';

export interface SeedInvestigationOptions {
  id: string;
  space?: string;
  status?: string;
  subject_type?: string;
  subject_id?: string;
  trigger_type?: string;
  concurrency_key?: string;
  executed_by?: string;
  created_at?: string;
  completed_at?: string;
  error?: string;
  summary?: string;
  conclusion?: string;
}

export const seedInvestigation = async (
  kbnClient: KbnClient,
  options: SeedInvestigationOptions
) => {
  const {
    id,
    space,
    status = 'running',
    subject_type = 'alert',
    subject_id = 'test-alert-1',
    trigger_type = 'manual',
    created_at = new Date().toISOString(),
    ...rest
  } = options;

  await kbnClient.savedObjects.create({
    type: SO_TYPE,
    id,
    overwrite: true,
    space,
    attributes: {
      investigation_id: id,
      status,
      subject_type,
      subject_id,
      trigger_type,
      created_at,
      ...rest,
    },
  });
};

export const deleteInvestigation = async (kbnClient: KbnClient, id: string, space?: string) => {
  try {
    await kbnClient.savedObjects.delete({ type: SO_TYPE, id, space });
  } catch {
    // ignore 404s during cleanup
  }
};
