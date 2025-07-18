/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { KibanaServices } from '../../../common/lib/kibana';

export const useCaseDetailsContextualInsights = ({ caseId, enabled }: { caseId?: string }) => {
  return useQuery(
    ['case_details_contextual_insights', caseId],
    async () => {
      const resp = await KibanaServices.get().http.get<{ alertContext: any[] }>(
        '/internal/observability/assistant/case_details_contextual_insights',
        { query: { case_id: caseId } }
      );
      return resp.alertContext ?? [];
    },
    {
      suspense: false,
      retry: false,
    }
  );
};
