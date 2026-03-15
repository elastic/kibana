/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useStartServices } from '../../../hooks';

/**
 * Builds the Kibana callback URL for the complete-integration-setup page.
 * This URL is passed to CloudFormation as a parameter so that after stack
 * creation, the Outputs tab includes a URL back to Kibana with prefilled data.
 */
export const useCompletionBaseUrl = (pkgkey: string, integration?: string): string | undefined => {
  const { http } = useStartServices();

  return useMemo(() => {
    if (!pkgkey) {
      return undefined;
    }

    try {
      const integrationSegment = integration ? `/${integration}` : '';
      const completionPath = `/app/fleet/integrations/${pkgkey}/complete-integration-setup${integrationSegment}`;
      const fullPath = http.basePath.prepend(completionPath);
      return `${window.location.origin}${fullPath}`;
    } catch {
      return undefined;
    }
  }, [http.basePath, integration, pkgkey]);
};
