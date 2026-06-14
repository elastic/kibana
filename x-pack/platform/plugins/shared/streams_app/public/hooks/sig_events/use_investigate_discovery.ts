/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export const useInvestigateDiscovery = () => {
  const { core } = useKibana();
  return useMutation({
    mutationFn: (discoverySlug: string) =>
      core.http.post<{ started: boolean }>(
        `/internal/streams/sig_events/discoveries/${encodeURIComponent(discoverySlug)}/_investigate`
      ),
  });
};
