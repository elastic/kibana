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
  EuiSpacer,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { useActions, type State } from '../../../../state';
import { ApiDefinitionInput } from './api_definition_input';
import { useKibana } from '../../../../../../../common/hooks/use_kibana';
import * as i18n from './translations';
import * as il8n_ds from '../../../../steps/data_stream_step/translations';
import { getApiPathsWithDescriptions } from './util';
import { getLangSmithOptions } from '../../../../../../../common/lib/lang_smith';
import { type AnalyzeApiRequestBody } from '../../../../../../../../common';
import { runAnalyzeApiGraph } from '../../../../../../../common/lib/api';

interface UploadSpecStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  showValidation: boolean;
  onShowValidation: () => void;
  onValidation: (updatedIsValid: boolean) => void;
  onAnalyzeApiGenerationComplete: (paths: string[]) => void;
}

export const UploadSpecStep = React.memo<UploadSpecStepProps>(
  ({
    integrationSettings,
    connector,
    isFlyoutGenerating,
    showValidation,
    onShowValidation,
    onValidation,
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
      onValidation(!fieldValidationErrors.title && !fieldValidationErrors.specFile);
    }, [fieldValidationErrors, onValidation]);

    const onUploadSpecFileSuccessful = useCallback(() => {
      setFieldValidationErrors((current) => ({ ...current, specFile: false }));
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
      onShowValidation,
      setIsFlyoutGenerating,
      dataStreamTitle,
      onAnalyzeApiGenerationComplete,
    ]);

    const onCancel = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
    }, [setIsFlyoutGenerating]);

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
                    onUploadSpecFileSuccessful={onUploadSpecFileSuccessful}
                  />
                  {successfulGeneration ? (
                    <EuiCallOut title={i18n.SUCCESS} color="success" iconType="check" />
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
                        {i18n.ANALYZE}
                      </EuiButton>
                      <EuiButtonEmpty
                        onClick={onCancel}
                        flush="left"
                        data-test-subj="buttonsFooter-cancelButton"
                      >
                        {i18n.CANCEL}
                      </EuiButtonEmpty>
                    </EuiFlexGroup>
                  )}
                </EuiFlexGroup>
                {error && (
                  <EuiFlexItem>
                    <EuiSpacer size="s" />
                    <EuiCallOut
                      title={i18n.GENERATION_ERROR}
                      color="danger"
                      iconType="alert"
                      data-test-subj="apiAnalyzeErrorCallout"
                    >
                      {error}
                    </EuiCallOut>
                  </EuiFlexItem>
                )}
              </EuiFlexItem>
            </EuiTimelineItem>
          </EuiTimeline>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
UploadSpecStep.displayName = 'UploadSpecStep';
