/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { useKibana } from '../utils/kibana_react';

export const useGetRuleTypes = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return getRuleTypes({ http });
  };

  const onError = () => {
    toasts.addDanger(
      i18n.translate('xpack.maintenanceWindows.hooks.useGetRuleTypes.error', {
        defaultMessage: 'Unable to load rule types.',
      })
    );
  };

  const { isLoading, isFetching, data } = useQuery({
    queryKey: ['useGetRuleTypes'],
    queryFn,
    onError,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
