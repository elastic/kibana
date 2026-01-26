/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { useKibana } from '../utils/kibana_react';

export const useGetRuleTypes = () => {
  const { http } = useKibana().services;

  const queryFn = () => {
    return getRuleTypes({ http });
  };

  const { isLoading, isFetching, data } = useQuery({
    queryKey: ['useGetRuleTypes'],
    queryFn,
    refetchOnWindowFocus: false,
    meta: {
      getErrorToast: () => ({
        type: 'danger',
        message: i18n.translate('xpack.maintenanceWindows.hooks.useGetRuleTypes.error', {
          defaultMessage: 'Unable to load rule types.',
        }),
      }),
    } satisfies ResponseOpsQueryMeta,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
