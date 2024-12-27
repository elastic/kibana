/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@tanstack/react-query';
import { casesMutationsKeys } from '../../containers/constants';

/**
 * Returns true or false if any of the queries and mutations
 * are fetching in the all cases page
 */

export const useIsLoadingCases = (): boolean => {
  const isDeletingCases = useIsMutating(casesMutationsKeys.deleteCases);
  const isUpdatingCases = useIsMutating(casesMutationsKeys.updateCases);
  return Boolean(isDeletingCases) || Boolean(isUpdatingCases);
};
