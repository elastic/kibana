/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { XJsonLang } from '@kbn/monaco';
import React, { useCallback, useState } from 'react';
import type { Pipeline } from '../../../../../../common';
import type { State } from '../../state';
import { FieldsTable } from './fields_table';
import { StepContentWrapper } from '../step_content_wrapper';
import { useCheckPipeline } from './use_check_pipeline';
import * as i18n from './translations';

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 0;
  }
`;

interface ReviewStepProps {
  integrationSettings: State['integrationSettings'];
  result: State['result'];
  isGenerating: State['isGenerating'];
}
export const ReviewStep = React.memo<ReviewStepProps>(
  ({ integrationSettings, isGenerating, result }) => {
    const [customPipeline, setCustomPipeline] = useState<Pipeline>();
    const { error: checkPipelineError } = useCheckPipeline({
      customPipeline,
      integrationSettings,
    });

    const [isPipelineEditionVisible, setIsPipelineEditionVisible] = useState(false);
    const [updatedPipeline, setUpdatedPipeline] = useState<string>();

    const changeCustomPipeline = useCallback((value: string) => {
      setUpdatedPipeline(value);
    }, []);

    const saveCustomPipeline = useCallback(() => {
      if (updatedPipeline) {
        try {
          const pipeline = JSON.parse(updatedPipeline);
          setCustomPipeline(pipeline);
        } catch (_) {
          return; // Syntax errors are already displayed in the code editor
        }
      }
      setIsPipelineEditionVisible(false);
    }, [updatedPipeline]);

    return (
      <StepContentWrapper
        title={i18n.TITLE}
        subtitle={i18n.DESCRIPTION}
        right={
          <EuiButton
            onClick={() => setIsPipelineEditionVisible(true)}
            data-test-subj="editPipelineButton"
          >
            {i18n.EDIT_PIPELINE_BUTTON}
          </EuiButton>
        }
      >
        <EuiPanel hasShadow={false} hasBorder data-test-subj="reviewStep">
          {isGenerating ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <>
              {checkPipelineError && (
                <EuiText color="danger" size="s">
                  {checkPipelineError}
                </EuiText>
              )}
              <FieldsTable documents={result?.docs} />
            </>
          )}
          {isPipelineEditionVisible && (
            <EuiFlyout onClose={() => setIsPipelineEditionVisible(false)}>
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="s">
                  <h2>{i18n.INGEST_PIPELINE_TITLE}</h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody css={flyoutBodyCss}>
                <EuiFlexGroup
                  direction="column"
                  gutterSize="s"
                  wrap={false}
                  responsive={false}
                  css={{ height: '100%' }}
                >
                  <EuiFlexItem grow={true}>
                    <CodeEditor
                      languageId={XJsonLang.ID}
                      value={JSON.stringify(result?.pipeline, null, 2)}
                      onChange={changeCustomPipeline}
                      width="100%"
                      height="100%"
                      options={{
                        fontSize: 12,
                        minimap: { enabled: true },
                        folding: true,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        automaticLayout: true,
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={saveCustomPipeline}
                      data-test-subj="savePipelineButton"
                    >
                      {i18n.SAVE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </EuiFlyout>
          )}
        </EuiPanel>
      </StepContentWrapper>
    );
  }
);
ReviewStep.displayName = 'ReviewStep';
