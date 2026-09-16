/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-types';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import {
  INLINE_ACTION_STEP_DEFINITIONS,
  definitionFromConnectorType,
} from '../registry';
import type { InlineActionStepDefinition } from '../registry';

const ALERT_ACTION_TYPES_KEY = ['alertingV2', 'actionForm', 'alertActionTypes'] as const;

/**
 * Loads connector/action types enabled for alerting and maps them to inline
 * workflow step definitions (preferring enriched static definitions when present).
 */
export const useFetchAlertActionStepDefinitions = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  const query = useQuery<ActionType[], Error>({
    queryKey: ALERT_ACTION_TYPES_KEY,
    queryFn: () => fetchConnectorTypes({ http, featureId: 'alerting' }),
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.actionForm.actionTypes.fetchError',
          { defaultMessage: 'Failed to load action types' }
        ),
      });
    },
  });

  const definitions = useMemo((): InlineActionStepDefinition[] => {
    const fromApi = (query.data ?? []).map((actionType) =>
      definitionFromConnectorType({
        actionTypeId: actionType.id,
        name: actionType.name,
      })
    );

    const seen = new Set(fromApi.map((definition) => definition.id));
    const missingStatic = INLINE_ACTION_STEP_DEFINITIONS.filter(
      (definition) => !seen.has(definition.id)
    );

    return [...fromApi, ...missingStatic].sort((a, b) => a.label.localeCompare(b.label));
  }, [query.data]);

  return { ...query, data: definitions };
};
