/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@kbn/react-query';
import { mutationKeys } from '../mutation_keys';

export const useIsSendingMessage = () => {
  const numSending = useIsMutating({ mutationKey: mutationKeys.sendMessage, fetching: true });
  const numResuming = useIsMutating({ mutationKey: mutationKeys.resumeRound, fetching: true });
  return numSending > 0 || numResuming > 0;
};
