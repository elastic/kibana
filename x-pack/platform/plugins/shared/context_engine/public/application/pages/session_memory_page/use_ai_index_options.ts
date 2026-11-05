/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { ListAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { getAiIndexListQueryOptions } from '../../hooks/use_list_ai_indices';
import { useKibana } from '../../hooks/use_kibana';

/** The AI indices available in this space, as combo box options. */
export const useAiIndexOptions = (): {
  options: Array<EuiComboBoxOptionOption<string>>;
  isLoading: boolean;
} => {
  const {
    services: { http },
  } = useKibana();
  const { data, isLoading } = useQuery<ListAiIndexResponse, Error>(
    getAiIndexListQueryOptions(http)
  );
  return {
    options: (data?.ai_indices ?? []).map(({ id }) => ({ label: id, value: id })),
    isLoading,
  };
};
