/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect } from 'react';
import type { CheckPipelineRequestBody, Pipeline } from '../../../../../../common';
import { useActions, type State } from '../../state';
import { runCheckPipelineResults } from '../../../../../common';

interface CheckPipelineProps {
  integrationSettings: State['integrationSettings'];
  customPipeline: Pipeline | undefined;
}

export const useCheckPipeline = ({ integrationSettings, customPipeline }: CheckPipelineProps) => {
  const { http, notifications } = useKibana().services;
  const { setIsGenerating, setResult } = useActions();
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    if (
      customPipeline == null ||
      http == null ||
      integrationSettings == null ||
      notifications?.toasts == null
    ) {
      return;
    }
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const parameters: CheckPipelineRequestBody = {
          pipeline: customPipeline,
          rawSamples: integrationSettings.logSamples ?? [],
        };
        setIsGenerating(true);

        const checkPipelineResults = await runCheckPipelineResults(parameters, deps);
        if (abortController.signal.aborted) return;
        if (isEmpty(checkPipelineResults?.results.docs)) {
          setError('No results for the pipeline');
          return;
        }
        setResult({
          pipeline: customPipeline,
          docs: checkPipelineResults.results.docs,
        });
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.body?.message ?? e.message}`);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [
    setIsGenerating,
    http,
    integrationSettings,
    notifications?.toasts,
    setResult,
    customPipeline,
  ]);

  return { error };
};
