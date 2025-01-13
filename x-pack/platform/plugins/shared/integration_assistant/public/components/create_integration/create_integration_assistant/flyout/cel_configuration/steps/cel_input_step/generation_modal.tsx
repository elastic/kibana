/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import type Oas from 'oas';
import { getLangSmithOptions } from '../../../../../../../common/lib/lang_smith';
import { type AnalyzeApiRequestBody } from '../../../../../../../../common';
import { runAnalyzeApiGraph } from '../../../../../../../common/lib/api';
import { useKibana } from '../../../../../../../common/hooks/use_kibana';
import type { State } from '../../../../state';
import * as i18n from './translations';
import { useTelemetry } from '../../../../../telemetry';
import type { ApiPathOptions } from '../../../../types';

export type OnComplete = (result: string[]) => void;

const getApiPathsWithDescriptions = (apiSpec: Oas | undefined): ApiPathOptions => {
  const pathMap: { [key: string]: string } = {};
  const pathObjs = apiSpec?.getPaths();
  if (pathObjs) {
    for (const [path, pathObj] of Object.entries(pathObjs)) {
      if (pathObj?.get) {
        const val = pathObj?.get?.getDescription()
          ? pathObj?.get?.getDescription()
          : pathObj?.get?.getSummary();
        pathMap[path] = val;
      }
    }
  }
  return pathMap;
};

interface UseGenerationProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  onComplete: OnComplete;
}
export const useGeneration = ({
  integrationSettings,
  connector,
  onComplete,
}: UseGenerationProps) => {
  const { reportCelGenerationComplete } = useTelemetry();
  const { http, notifications } = useKibana().services;
  const [error, setError] = useState<null | string>(null);
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
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const apiOptions = getApiPathsWithDescriptions(integrationSettings.apiSpec);
        const analyzeApiRequest: AnalyzeApiRequestBody = {
          dataStreamTitle: integrationSettings.dataStreamTitle ?? '',
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

        onComplete(result);
      } catch (e) {
        if (abortController.signal.aborted) return;
        const errorMessage = `${e.message}${
          e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
        }`;

        setError(errorMessage);
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
    connector,
    http,
    integrationSettings,
    reportCelGenerationComplete,
    notifications?.toasts,
  ]);

  const retry = useCallback(() => {
    setError(null);
    setIsRequesting(true);
  }, []);

  return { error, retry };
};

const useModalCss = () => {
  const { euiTheme } = useEuiTheme();
  return {
    headerCss: css`
      justify-content: center;
      margin-top: ${euiTheme.size.m};
    `,
    bodyCss: css`
      padding: ${euiTheme.size.xxxxl};
      min-width: 600px;
    `,
  };
};

interface GenerationModalProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  onComplete: OnComplete;
  onClose: () => void;
}
export const GenerationModal = React.memo<GenerationModalProps>(
  ({ integrationSettings, connector, onComplete, onClose }) => {
    const { headerCss, bodyCss } = useModalCss();
    const { error, retry } = useGeneration({
      integrationSettings,
      connector,
      onComplete,
    });

    return (
      <EuiModal onClose={onClose} data-test-subj="celGenerationModal">
        <EuiModalHeader css={headerCss}>
          <EuiModalHeaderTitle>{i18n.ANALYZING}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody css={bodyCss}>
          <EuiFlexGroup direction="column" gutterSize="l" justifyContent="center">
            {error ? (
              <EuiFlexItem>
                <EuiCallOut
                  title={i18n.GENERATION_ERROR}
                  color="danger"
                  iconType="alert"
                  data-test-subj="celGenerationErrorCallout"
                >
                  {error}
                </EuiCallOut>
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexItem>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.PROGRESS_CEL_INPUT_GRAPH}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem />
              </>
            )}
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          {error ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="refresh" onClick={retry} data-test-subj="retryCelButton">
                  {i18n.RETRY}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiSpacer size="xl" />
          )}
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
GenerationModal.displayName = 'GenerationModal';
