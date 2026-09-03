/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useKibana } from './use_kibana';

/**
 * Announces the AI index on screen for as long as this page is mounted, and withdraws it on the way
 * out so an open assistant never keeps a page the user has left.
 */
export const usePublishViewedAiIndex = (aiIndex: GetAiIndexResponse | undefined): void => {
  const {
    services: { setViewedAiIndex },
  } = useKibana();

  useEffect(() => {
    if (!setViewedAiIndex) {
      return;
    }

    setViewedAiIndex(aiIndex);

    return () => setViewedAiIndex(undefined);
  }, [setViewedAiIndex, aiIndex]);
};
