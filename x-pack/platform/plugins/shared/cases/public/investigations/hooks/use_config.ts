/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { StatusesConfiguration } from '../../../common/investigations/statuses';
import { getCapabilities, getInvestigationTypes, getStatuses, saveStatuses } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const useInvestigationTypes = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.types(), () => getInvestigationTypes(http), {
    staleTime: FIVE_MINUTES_MS,
    retry: false,
  });
};

export const useCapabilities = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.capabilities(), () => getCapabilities(http), {
    staleTime: FIVE_MINUTES_MS,
    retry: false,
  });
};

const STATUSES_KEY = [...investigationKeys.all, 'statuses'] as const;
const THIRTY_SECONDS_MS = 30 * 1000;

/** The space's status list and pause reasons (`GET _statuses`). */
export const useStatuses = () => {
  const { http } = useInvestigationsServices();

  return useQuery(STATUSES_KEY, () => getStatuses(http), {
    staleTime: THIRTY_SECONDS_MS,
    retry: false,
  });
};

/**
 * Saves the status list (`PUT _statuses`). Callers show the server's 400, 403 and 409 messages
 * themselves, so there is no error toast. On success the cache holds the new version.
 */
export const useSaveStatuses = () => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();

  return useMutation((body: StatusesConfiguration) => saveStatuses(http, body), {
    onSuccess: (saved) => queryClient.setQueryData(STATUSES_KEY, saved),
  });
};

/** Refetches the status list, for example after a version conflict. */
export const useReloadStatuses = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries(STATUSES_KEY);
};
