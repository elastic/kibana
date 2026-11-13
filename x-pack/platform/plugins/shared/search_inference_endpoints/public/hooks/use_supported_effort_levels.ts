/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getSupportedReasoningEffortLevels } from '@kbn/inference-common';
import type { ReasoningEffortLevel } from '../../common/types';
import { isReasoningEffortLevel } from '../../common/type_guards';
import { useConnectors } from './use_connectors';

export const useSupportedEffortLevels = (): Map<string, ReasoningEffortLevel[]> => {
  const { data: connectors } = useConnectors();

  return useMemo(
    () =>
      new Map(
        (connectors ?? []).flatMap((connector): Array<[string, ReasoningEffortLevel[]]> => {
          const levels = (getSupportedReasoningEffortLevels(connector) ?? []).filter(
            isReasoningEffortLevel
          );
          return levels.length > 0 ? [[connector.connectorId, levels]] : [];
        })
      ),
    [connectors]
  );
};
