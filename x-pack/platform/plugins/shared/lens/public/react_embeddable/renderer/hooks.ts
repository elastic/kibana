/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { useMemo } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { LensInternalApi } from '../types';

/**
 * This hooks known how to extract message based on types for the UI
 */
export function useMessages({ messages$ }: LensInternalApi) {
  const latestMessages = useStateFromPublishingSubject(messages$);
  return useMemo(
    () => partition(latestMessages, ({ severity }) => severity !== 'info'),
    [latestMessages]
  );
}
