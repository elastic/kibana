/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFormRow, EuiLink, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useKibana } from '../../../../../../../hooks/use_kibana';

// TODO - add return type
export const useEnrichPolicies = () => {
  const {
    dependencies: {
      start: { indexManagement },
    },
  } = useKibana();

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['enrichPolicies'],
    queryFn: async () => {
      const response = await indexManagement.apiService.getAllEnrichPolicies();
      return response.data ?? [];
    },
  });

  return { policies: data ?? [], isLoading, isFetched };
};

// TODO - handle errors and prompt to create a policy if no policies are found
export const EnrichPolicySelector = () => {
  const { control } = useFormContext();
  const { policies, isLoading, isFetched } = useEnrichPolicies();
  const { core } = useKibana();
  const createEnrichPolicyUrl = core.application.getUrlForApp('management', {
    path: '/data/index_management/enrich_policies/create',
  });

  if (isFetched && policies.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.streams.enrichPolicySelector.h2.noEnrichPoliciesFoundLabel', {
              defaultMessage: 'No enrich policies found',
            })}
          </h2>
        }
        actions={
          <EuiLink href={createEnrichPolicyUrl} target="_blank">
            {i18n.translate('xpack.streams.enrichPolicySelector.createEnrichPolicyLinkLabel', {
              defaultMessage: 'Create enrich policy',
            })}
          </EuiLink>
        }
      />
    );
  }

  return (
    <Controller
      control={control}
      name="policy_name"
      render={({ field }) => (
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.enrichPolicyLabel',
            { defaultMessage: 'Enrich policy' }
          )}
        >
          <EuiSelect
            hasNoInitialSelection
            options={policies.map((policy) => ({
              text: policy.name,
              value: policy.name,
            }))}
            value={field.value}
            onChange={field.onChange}
            isLoading={isLoading}
          />
        </EuiFormRow>
      )}
    />
  );
};
