/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { useActions, type State } from '../../../../state';
import { ApiDefinitionInput } from './api_definition_input';
import * as i18n from './translations';
import * as il8n_ds from '../../../../steps/data_stream_step/translations';
import { getApiPathsWithDescriptions } from './util';
import { type AnalyzeApiRequestBody } from '../../../../../../../../common';
import { runAnalyzeApiGraph, getLangSmithOptions, useKibana } from '../../../../../../../common';
import { GenerationError } from '../../generation_error';

interface UploadSpecStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  showValidation: boolean;
  onShowValidation: () => void;
  onUpdateValidation: (updatedIsValid: boolean) => void;
  onUpdateNeedsGeneration: (updatedNeedsGeneration: boolean) => void;
  onAnalyzeApiGenerationComplete: (paths: string[]) => void;
}

export const UploadSpecStep = React.memo<UploadSpecStepProps>(
  ({
    integrationSettings,
    connector,
    isFlyoutGenerating,
    showValidation,
    onShowValidation,
    onUpdateValidation,
    onUpdateNeedsGeneration,
    onAnalyzeApiGenerationComplete,
  }) => {
    const { setIntegrationSettings, setIsFlyoutGenerating } = useActions();

    const { http, notifications } = useKibana().services;
    const [successfulGeneration, setSuccessfulGeneration] = useState<boolean>(false);
    const [error, setError] = useState<null | string>(null);

    const [dataStreamTitle, setDataStreamTitle] = useState<string>(
      integrationSettings?.dataStreamTitle ?? ''
    );

    const [fieldValidationErrors, setFieldValidationErrors] = useState({
      title: dataStreamTitle === '',
      specFile: true,
    });

    const onChangeDataStreamTitle = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDataStreamTitle = e.target.value;
        setDataStreamTitle(nextDataStreamTitle);
        setIntegrationSettings({ ...integrationSettings, dataStreamTitle: nextDataStreamTitle });
        const isMissing = nextDataStreamTitle === undefined || nextDataStreamTitle === '';
        setFieldValidationErrors((current) => ({ ...current, title: isMissing }));
        setSuccessfulGeneration(false);
      },
      [setIntegrationSettings, integrationSettings]
    );

    useEffect(() => {
      onUpdateValidation(!fieldValidationErrors.title && !fieldValidationErrors.specFile);
    }, [fieldValidationErrors, onUpdateValidation]);

    const onModifySpecFile = useCallback((hasValidFile: boolean) => {
      setFieldValidationErrors((current) => ({ ...current, specFile: !hasValidFile }));
      setSuccessfulGeneration(false);
    }, []);

    const onAnalyze = useCallback(() => {
      if (fieldValidationErrors.title || fieldValidationErrors.specFile) {
        onShowValidation();
        return;
      }

      if (
        http == null ||
        connector == null ||
        integrationSettings == null ||
        notifications?.toasts == null
      ) {
        return;
      }

      setError(null);
      onUpdateNeedsGeneration(false);

      const abortController = new AbortController();
      const deps = { http, abortSignal: abortController.signal };
      (async () => {
        try {
          setIsFlyoutGenerating(true);

          const apiOptions = getApiPathsWithDescriptions(integrationSettings.apiSpec);
          const analyzeApiRequest: AnalyzeApiRequestBody = {
            dataStreamTitle,
            pathOptions: apiOptions,
            connectorId: connector.id,
            langSmithOptions: getLangSmithOptions(),
          };
          const apiAnalysisGraphResult = await runAnalyzeApiGraph(analyzeApiRequest, deps);
          if (abortController.signal.aborted) return;
          if (isEmpty(apiAnalysisGraphResult?.results)) {
            throw new Error('Results not found in response');
          }

          const result = apiAnalysisGraphResult.results.suggestedPaths;
          onAnalyzeApiGenerationComplete(result);
          setSuccessfulGeneration(true);
        } catch (e) {
          if (abortController.signal.aborted) return;
          const errorMessage = `${e.message}${
            e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
          }`;
          setError(errorMessage);
        } finally {
          setIsFlyoutGenerating(false);
        }
      })();
      return () => {
        abortController.abort();
      };
    }, [
      fieldValidationErrors.title,
      fieldValidationErrors.specFile,
      http,
      connector,
      integrationSettings,
      notifications?.toasts,
      onUpdateNeedsGeneration,
      onShowValidation,
      setIsFlyoutGenerating,
      dataStreamTitle,
      onAnalyzeApiGenerationComplete,
    ]);

    const onCancel = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
      onUpdateNeedsGeneration(true);
    }, [onUpdateNeedsGeneration, setIsFlyoutGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="uploadSpecStep">
        <EuiFlexItem>
          <EuiTimeline>
            <EuiTimelineItem verticalAlign="top" icon={'dot'}>
              <EuiFormRow
                fullWidth
                isDisabled={isFlyoutGenerating}
                label={il8n_ds.DATA_STREAM_TITLE_LABEL}
                isInvalid={showValidation && fieldValidationErrors.title}
                error={i18n.DATASTREAM_TITLE_REQUIRED}
              >
                <EuiFieldText
                  fullWidth
                  name="dataStreamTitle"
                  data-test-subj="dataStreamTitleInput"
                  isInvalid={showValidation && fieldValidationErrors.title}
                  value={dataStreamTitle}
                  onChange={onChangeDataStreamTitle}
                />
              </EuiFormRow>
            </EuiTimelineItem>
            <EuiTimelineItem verticalAlign="top" icon={'dot'}>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" gutterSize="l">
                  <ApiDefinitionInput
                    integrationSettings={integrationSettings}
                    isGenerating={isFlyoutGenerating}
                    showValidation={showValidation}
                    onModifySpecFile={onModifySpecFile}
                  />
                  {successfulGeneration ? (
                    <EuiCallOut
                      title={i18n.SUCCESS}
                      color="success"
                      iconType="check"
                      data-test-subj="successCallout"
                    />
                  ) : error ? (
                    <GenerationError
                      title={i18n.GENERATION_ERROR}
                      error={error}
                      retryAction={onAnalyze}
                    />
                  ) : (
                    <EuiFlexGroup justifyContent="flexStart">
                      <EuiButton
                        fill
                        fullWidth={false}
                        isDisabled={
                          isFlyoutGenerating ||
                          (showValidation &&
                            (fieldValidationErrors.title || fieldValidationErrors.specFile))
                        }
                        isLoading={isFlyoutGenerating}
                        color="primary"
                        onClick={onAnalyze}
                        data-test-subj="analyzeApiButton"
                      >
                        {isFlyoutGenerating ? i18n.ANALYZING : i18n.ANALYZE}
                      </EuiButton>
                      {isFlyoutGenerating && (
                        <EuiButtonEmpty
                          onClick={onCancel}
                          flush="left"
                          data-test-subj="cancelAnalyzeApiButton"
                        >
                          {i18n.CANCEL}
                        </EuiButtonEmpty>
                      )}
                    </EuiFlexGroup>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiTimelineItem>
          </EuiTimeline>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
UploadSpecStep.displayName = 'UploadSpecStep';
