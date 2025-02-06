/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { RulesSettingsAlertDeletion } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { getAlertDeletionSettings } from '../lib/rule_api/get_alert_deletion_settings';

interface UseGetAlertDeletionSettingsProps {
  enabled: boolean;
  onSuccess: (settings: RulesSettingsAlertDeletion) => void;
}

export const useGetAlertDeletionSettings = (props: UseGetAlertDeletionSettingsProps) => {
  const { enabled, onSuccess } = props;
  const { http } = useKibana().services;

  const queryFn = () => {
    return getAlertDeletionSettings({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading } = useQuery({
    queryKey: ['getAlertDeletionSettings'],
    queryFn,
    onSuccess,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isLoading: isLoading || isFetching,
    isError: isError || isLoadingError,
    data,
  };
};
