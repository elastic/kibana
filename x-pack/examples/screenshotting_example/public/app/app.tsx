/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { API_ENDPOINT, ScreenshottingExpressionResponse } from '../../common';
import { useAppContext } from './http_context';

export function App() {
  const { http, ...startServices } = useAppContext();
  const [expression, setExpression] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ScreenshottingExpressionResponse>();

  const handleClick = useCallback(async () => {
    try {
      setLoading(true);
      setResponse(
        await http.get<ScreenshottingExpressionResponse>(API_ENDPOINT, {
          query: { expression },
        })
      );
    } finally {
      setLoading(false);
    }
  }, [expression, http]);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExpression(e.target.value);
  }, []);

  return (
    <KibanaRenderContextProvider {...startServices}>
      <EuiPage>
        <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>Screenshotting Demo</h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageSection>
            <EuiText>
              <p>This example captures a screenshot of an expression provided below.</p>
            </EuiText>
            <EuiSpacer size={'m'} />
            <EuiTextArea
              placeholder="Expression to render"
              fullWidth
              onChange={handleChange}
              data-test-subj="expression"
            />
            <EuiSpacer size={'m'} />
            <EuiButton
              iconType="play"
              onClick={handleClick}
              isDisabled={!expression}
              isLoading={loading}
              data-test-subj="run"
            >
              Run
            </EuiButton>
            {!!response && <EuiHorizontalRule />}
            {response?.errors && (
              <>
                <EuiCallOut
                  title="Sorry, there was an error"
                  color="danger"
                  iconType="warning"
                  data-test-subj="error"
                >
                  <p>{response.errors.join('\n')}</p>
                </EuiCallOut>
                <EuiSpacer size={'m'} />
              </>
            )}
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                {response?.image && (
                  <EuiImage
                    src={`data:image/png;base64,${response.image}`}
                    alt="Screenshot"
                    size="xl"
                    allowFullScreen
                    hasShadow
                    data-test-subj="image"
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                {response?.metrics && (
                  <>
                    <EuiStat
                      title={`${response.metrics.cpuInPercentage ?? 'N/A'}%`}
                      description="CPU"
                      titleColor="primary"
                      data-test-subj="cpu"
                    />
                    <EuiSpacer size={'m'} />
                    <EuiStat
                      title={`${response.metrics.memoryInMegabytes ?? 'N/A'} MB`}
                      description="Memory"
                      titleColor="primary"
                      data-test-subj="memory"
                    />
                  </>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </KibanaRenderContextProvider>
  );
}
