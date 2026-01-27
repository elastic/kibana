/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { useKibana } from '../../common/lib/kibana';
import { loadActionTypes } from '../lib/action_connector_api';

export const useLoadActionTypesQuery = () => {
  const { http, actionTypeRegistry } = useKibana().services;

  const queryFn = () => {
    return loadActionTypes({ http, featureId: AlertingConnectorFeatureId });
  };

  const { data = [] } = useQuery({
    queryKey: ['loadActionTypes'],
    queryFn,
    refetchOnWindowFocus: false,
    meta: {
      getErrorToast: () => ({
        type: 'danger',
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.unableToLoadConnectorTypesMessage',
          { defaultMessage: 'Unable to load connector types' }
        ),
      }),
    } satisfies ResponseOpsQueryMeta,
  });

  const sortedResult = data
    .filter(({ id }) => actionTypeRegistry.has(id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    actionTypes: sortedResult,
  };
};
