/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionVariable } from '@kbn/alerting-types';
import { useRef } from 'react';
import { isEmpty } from 'lodash';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import { fetchRuleTypeAlertFields, getDescription } from '@kbn/alerts-ui-shared/src/common/apis';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

export interface UseLoadRuleTypeAlertFieldsProps {
  http: HttpStart;
  ruleTypeId?: string;
  enabled: boolean;
  cacheTime?: number;
  fieldsMetadata?: FieldsMetadataPublicStart;
}

export const useLoadRuleTypeAlertFields = (props: UseLoadRuleTypeAlertFieldsProps) => {
  const ecsFlat = useRef<Record<string, any>>({});
  const { http, ruleTypeId, enabled, cacheTime, fieldsMetadata } = props;

  const queryFn = async () => {
    if (!ruleTypeId) {
      return;
    }

    if (isEmpty(ecsFlat.current)) {
      const fmClient = await fieldsMetadata?.getClient();
      if (fmClient) {
        const { fields } = await fmClient.find({});
        ecsFlat.current = fields;
      }
    }

    return fetchRuleTypeAlertFields({ http, ruleTypeId });
  };

  const {
    data = [],
    isLoading,
    isFetching,
    isInitialLoading,
  } = useQuery({
    queryKey: ['useLoadRuleTypeAlertFields', ruleTypeId],
    queryFn,
    select: (dataViewFields) => {
      if (!dataViewFields) return [];

      return dataViewFields?.map<ActionVariable>((d) => ({
        name: d.name,
        description: getDescription(d.name, ecsFlat.current),
      }));
    },
    cacheTime,
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
