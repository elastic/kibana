/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { Docs, ESProcessorItem, Pipeline, SamplesFormat } from '../../../../../../common';
import {
  type AnalyzeLogsRequestBody,
  type CategorizationRequestBody,
  type EcsMappingRequestBody,
  type RelatedRequestBody,
} from '../../../../../../common';
import { isGenerationErrorBody } from '../../../../../../common/api/generation_error';
import {
  getLangSmithOptions,
  runCategorizationGraph,
  runEcsGraph,
  runRelatedGraph,
  runAnalyzeLogsGraph,
  useKibana,
} from '../../../../../common';
import type { State } from '../../state';
import * as i18n from './translations';
import { useTelemetry } from '../../../telemetry';
import type { AIConnector, IntegrationSettings } from '../../types';
import type { ErrorMessageWithLink } from '../../../../../../common/api/generation_error';
import { GenerationErrorCode } from '../../../../../../common/constants';

export type OnComplete = (result: State['result']) => void;
export const ProgressOrder = ['analyzeLogs', 'ecs', 'categorization', 'related'] as const;
export type ProgressItem = (typeof ProgressOrder)[number];

interface UseGenerationProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  onComplete: OnComplete;
}

interface RunGenerationProps {
  integrationSettings: IntegrationSettings;
  connector: AIConnector;
  deps: { http: HttpSetup; abortSignal: AbortSignal };
  setProgress: (progress: ProgressItem) => void;
}

// If the result is classified as a generation error, produce an error message
// as defined in the i18n file. Otherwise, return undefined.
function generationErrorMessage(
  body: unknown | undefined
): string | ErrorMessageWithLink | undefined {
  if (!isGenerationErrorBody(body)) {
    return;
  }

  const errorCode = body.attributes.errorCode;
  if (errorCode === GenerationErrorCode.CEF_ERROR) {
    if (body.attributes.errorMessageWithLink !== undefined) {
      return {
        link: body.attributes.errorMessageWithLink.link,
        errorMessage: i18n.DECODE_CEF_LINK,
        linkText: body.attributes.errorMessageWithLink.linkText,
      };
    }
  }
  const translation = i18n.GENERATION_ERROR_TRANSLATION[errorCode];
  return typeof translation === 'function' ? translation(body.attributes) : translation;
}

interface GenerationResults {
  pipeline: Pipeline;
  docs: Docs;
  samplesFormat?: SamplesFormat;
}

export const useGeneration = ({
  integrationSettings,
  connector,
  onComplete,
}: UseGenerationProps) => {
  const { reportGenerationComplete } = useTelemetry();
  const { http, notifications } = useKibana().services;
  const [progress, setProgress] = useState<ProgressItem>();
  const [error, setError] = useState<null | string | ErrorMessageWithLink>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(true);

  useEffect(() => {
    if (
      !isRequesting ||
      http == null ||
      connector == null ||
      integrationSettings == null ||
      notifications?.toasts == null
    ) {
      return;
    }
    const generationStartedAt = Date.now();
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const result = await runGeneration({ integrationSettings, connector, deps, setProgress });
        const durationMs = Date.now() - generationStartedAt;
        reportGenerationComplete({ connector, integrationSettings, durationMs });
        onComplete(result);
      } catch (e) {
        if (abortController.signal.aborted) return;
        const originalErrorMessage = `${e.message}${
          e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
        }`;

        reportGenerationComplete({
          connector,
          integrationSettings,
          durationMs: Date.now() - generationStartedAt,
          error: originalErrorMessage,
        });

        setError(generationErrorMessage(e.body) ?? originalErrorMessage);
      } finally {
        setIsRequesting(false);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [
    isRequesting,
    onComplete,
    setProgress,
    connector,
    http,
    integrationSettings,
    reportGenerationComplete,
    notifications?.toasts,
  ]);

  const retry = useCallback(() => {
    setError(null);
    setIsRequesting(true);
  }, []);

  return { progress, error, retry };
};

async function runGeneration({
  integrationSettings,
  connector,
  deps,
  setProgress,
}: RunGenerationProps): Promise<GenerationResults> {
  let additionalProcessors: ESProcessorItem[] | undefined;
  // logSamples may be modified to JSON format if they are in different formats
  // Keeping originalLogSamples for running pipeline and generating docs
  const originalLogSamples = integrationSettings.logSamples;
  let logSamples = integrationSettings.logSamples;
  let samplesFormat: SamplesFormat | undefined = integrationSettings.samplesFormat;

  if (integrationSettings.samplesFormat === undefined) {
    const analyzeLogsRequest: AnalyzeLogsRequestBody = {
      packageName: integrationSettings.name ?? '',
      dataStreamName: integrationSettings.dataStreamName ?? '',
      packageTitle: integrationSettings.title ?? integrationSettings.name ?? '',
      dataStreamTitle:
        integrationSettings.dataStreamTitle ?? integrationSettings.dataStreamName ?? '',
      logSamples: integrationSettings.logSamples ?? [],
      connectorId: connector.id,
      langSmithOptions: getLangSmithOptions(),
    };

    setProgress('analyzeLogs');
    const analyzeLogsResult = await runAnalyzeLogsGraph(analyzeLogsRequest, deps);
    if (isEmpty(analyzeLogsResult?.results)) {
      throw new Error('No results from Analyze Logs Graph');
    }
    logSamples = analyzeLogsResult.results.parsedSamples;
    samplesFormat = analyzeLogsResult.results.samplesFormat;
    additionalProcessors = analyzeLogsResult.additionalProcessors;
  }

  const ecsRequest: EcsMappingRequestBody = {
    packageName: integrationSettings.name ?? '',
    dataStreamName: integrationSettings.dataStreamName ?? '',
    rawSamples: logSamples ?? [],
    samplesFormat: samplesFormat ?? { name: 'json' },
    additionalProcessors: additionalProcessors ?? [],
    connectorId: connector.id,
    langSmithOptions: getLangSmithOptions(),
  };

  setProgress('ecs');
  const ecsGraphResult = await runEcsGraph(ecsRequest, deps);
  if (isEmpty(ecsGraphResult?.results)) {
    throw new Error('No results from ECS graph');
  }
  const categorizationRequest: CategorizationRequestBody = {
    ...ecsRequest,
    rawSamples: originalLogSamples ?? [],
    samplesFormat: samplesFormat ?? { name: 'json' },
    currentPipeline: ecsGraphResult.results.pipeline,
  };

  setProgress('categorization');
  const categorizationResult = await runCategorizationGraph(categorizationRequest, deps);
  const relatedRequest: RelatedRequestBody = {
    ...categorizationRequest,
    currentPipeline: categorizationResult.results.pipeline,
  };

  setProgress('related');
  const relatedGraphResult = await runRelatedGraph(relatedRequest, deps);
  if (isEmpty(relatedGraphResult?.results)) {
    throw new Error('Results not found in response');
  }

  return {
    pipeline: relatedGraphResult.results.pipeline,
    docs: relatedGraphResult.results.docs,
    samplesFormat,
  };
}
