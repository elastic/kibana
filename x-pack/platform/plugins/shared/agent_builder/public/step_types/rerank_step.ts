/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { rerankStepCommonDefinition } from '../../common/step_types/rerank_step';
import { createInferenceIdSelectionHandler } from './inference_id_selection';

export const createRerankStepDefinition = (core: CoreSetup) => {
  let httpPromise: Promise<HttpStart> | null = null;

  const getHttp = async (): Promise<HttpStart> => {
    if (!httpPromise) {
      httpPromise = core.getStartServices().then(([coreStart]) => coreStart.http);
    }
    return httpPromise;
  };

  return createPublicStepDefinition({
    ...rerankStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/sortable').then(({ icon }) => ({
        default: icon,
      }))
    ),
    editorHandlers: {
      config: {
        inference_id: {
          selection: createInferenceIdSelectionHandler(getHttp),
        },
      },
    },
  });
};
