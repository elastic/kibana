/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

export const useFetchHistoricalResultsAbortControllers = () => {
  const fetchHistoricalResultsFromDateAbortControllerRef = useRef(new AbortController());
  const fetchHistoricalResultsFromOutcomeAbortControllerRef = useRef(new AbortController());
  const fetchHistoricalResultsFromSetPageAbortControllerRef = useRef(new AbortController());
  const fetchHistoricalResultsFromSetSizeAbortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const fetchHistoricalResultsAbortController =
      fetchHistoricalResultsFromDateAbortControllerRef.current;
    const fetchHistoricalResultsFromOutcomeAbortController =
      fetchHistoricalResultsFromOutcomeAbortControllerRef.current;
    const fetchHistoricalResultsFromSetPageAbortController =
      fetchHistoricalResultsFromSetPageAbortControllerRef.current;
    const fetchHistoricalResultsFromSetSizeAbortController =
      fetchHistoricalResultsFromSetSizeAbortControllerRef.current;

    return () => {
      fetchHistoricalResultsAbortController.abort();
      fetchHistoricalResultsFromOutcomeAbortController.abort();
      fetchHistoricalResultsFromSetPageAbortController.abort();
      fetchHistoricalResultsFromSetSizeAbortController.abort();
    };
  }, []);

  return {
    fetchHistoricalResultsFromDateAbortControllerRef,
    fetchHistoricalResultsFromOutcomeAbortControllerRef,
    fetchHistoricalResultsFromSetPageAbortControllerRef,
    fetchHistoricalResultsFromSetSizeAbortControllerRef,
  };
};
