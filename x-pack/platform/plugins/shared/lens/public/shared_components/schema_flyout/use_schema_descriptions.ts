/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { FieldDescriptor } from './types';

interface VizSchemaResponse {
  fields: FieldDescriptor[];
}

export const useSchemaDescriptions = (visualizationId: string) => {
  const { services } = useKibana();

  const { data: allDescriptions, isLoading } = useQuery(
    ['lens', 'schema_descriptions', visualizationId],
    () =>
      services.http!.get<Record<string, VizSchemaResponse>>('/internal/lens/schema_descriptions', {
        query: { vizId: visualizationId },
      }),
    {
      staleTime: Infinity,
      enabled: !!services.http,
    }
  );

  return {
    data: allDescriptions?.[visualizationId]?.fields ?? [],
    isLoading,
  };
};
