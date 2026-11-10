/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * True on self-managed deployments, where the agentless infrastructure the
 * `managed_integration` and ECF methods rely on does not exist.
 *
 * `isCloudEnabled` is true on both ECH and serverless, so the single negated check covers
 * every cloud flavour. `cloud` is an optional plugin — its absence means self-managed.
 */
export const useIsSelfManaged = (): boolean => {
  const {
    services: { cloud },
  } = useKibana<{ cloud?: CloudStart }>();

  return !cloud?.isCloudEnabled;
};
