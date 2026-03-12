/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../../../hooks/use_kibana';

export const useEnrichPolicies = () => {
  const {
    dependencies: {
      start: { indexManagement },
    },
  } = useKibana();

  const { data, isLoading, error } = useQuery({
    queryKey: ['enrichPolicies'],
    queryFn: async () => {
      const response = await indexManagement.apiService.getAllEnrichPolicies();
      return response.data ?? [];
    },
  });

  return { policies: data ?? [], isLoading, error };
};

// TODO - handle errors and prompt to create a policy if no policies are found
export const EnrichPolicySelector = () => {
  const { policies, isLoading, error } = useEnrichPolicies();

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.enrichPolicyLabel',
        { defaultMessage: 'Enrich policy' }
      )}
    >
      <EuiSelect
        options={policies.map((policy) => ({
          text: policy.name,
        }))}
        isLoading={isLoading}
      />
    </EuiFormRow>
  );
};
