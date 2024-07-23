/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';

export const useCapabilities = jest.fn().mockReturnValue({
  isLoading: false,
  isError: false,
  data: defaultAssistantFeatures,
  error: null,
  isFetching: false,
  isSuccess: true,
});
