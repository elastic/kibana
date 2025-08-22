/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { loadGaps, type LoadGapsProps } from '../lib/rule_api/load_gaps';

interface CommonProps {
  onError?: (err: any) => void;
}

export type LoadRuleGapsProps = LoadGapsProps & CommonProps;

export function useLoadRuleGaps(props: LoadRuleGapsProps) {
  const { http } = useKibana().services;
  const queryFn = useCallback(() => {
    return loadGaps({ http, ...props });
  }, [props, http]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['loadRuleGaps', props],
    queryFn,
    onError: props.onError,
    retry: 0,
    refetchOnWindowFocus: false,
  });
  return useMemo(
    () => ({
      data,
      isLoading: isLoading || isFetching,
      loadRuleGaps: refetch,
    }),
    [data, isFetching, isLoading, refetch]
  );
}
