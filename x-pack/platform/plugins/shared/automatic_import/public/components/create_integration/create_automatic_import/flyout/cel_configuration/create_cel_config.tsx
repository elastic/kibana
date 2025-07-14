/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiStepNumber,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CelInput } from '../../../../../../common';
import { type CelAuthType } from '../../../../../../common';
import { useActions, type State } from '../../state';
import * as i18n from './translations';
import { UploadSpecStep } from './steps/upload_spec_step';
import { ConfirmSettingsStep } from './steps/confirm_settings_step';
import { Footer } from './footer';

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 80;
  }
`;

export type CelFlyoutStepName = 'upload_spec' | 'confirm_details' | 'success';

interface CreateCelConfigFlyoutProps {
  integrationSettings: State['integrationSettings'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  connector: State['connector'];
}

export const CreateCelConfigFlyout = React.memo<CreateCelConfigFlyoutProps>(
  ({ integrationSettings, isFlyoutGenerating, connector }) => {
    const { setShowCelCreateFlyout, setCelInputResult, setIntegrationSettings } = useActions();

    const [suggestedPaths, setSuggestedPaths] = useState<string[]>([]);

    const isAnalyzeApiGenerationComplete = suggestedPaths.length > 0;

    const [completedCelGeneration, setCompletedCelGeneration] = useState<boolean>(false);
    const [celConfig, setCelConfig] = useState<CelInput | undefined>(undefined);

    const [showValidation, setShowValidation] = useState<boolean>(false);
    const [needsGeneration, setNeedsGeneration] = useState<boolean>(true);
    const [isValid, setIsValid] = useState<boolean>(false);

    const [isUploadStepExpanded, setIsUploadStepExpanded] = useState<boolean>(true);
    const [isConfirmStepExpanded, setIsConfirmStepExpanded] = useState<boolean>(false);

    const onSaveConfig = useCallback(() => {
      if (completedCelGeneration) {
        setShowCelCreateFlyout(false);
        if (celConfig !== undefined) {
          setCelInputResult(celConfig);
        }
      } else {
        setShowValidation(true);
      }
    }, [celConfig, completedCelGeneration, setCelInputResult, setShowCelCreateFlyout]);

    const onCancel = useCallback(() => {
      setShowCelCreateFlyout(false);
    }, [setShowCelCreateFlyout]);

    const handleToggleStep = () => {
      setIsUploadStepExpanded(!isUploadStepExpanded);
      setIsConfirmStepExpanded(!isConfirmStepExpanded);
    };

    const onAnalyzeApiGenerationComplete = useCallback(
      (paths: string[]) => {
        setSuggestedPaths(paths);
        // reset validation and show next step
        setShowValidation(false);
        setNeedsGeneration(true);
        setIsUploadStepExpanded(false);
        setIsConfirmStepExpanded(true);
      },
      [setSuggestedPaths]
    );

    const onCelInputGenerationComplete = useCallback(
      (path: string, auth: CelAuthType, celInputResult: CelInput) => {
        setCelConfig(celInputResult);
        setIntegrationSettings({
          ...integrationSettings,
          celPath: path,
          celAuth: auth,
        });
        setCompletedCelGeneration(true);
        setShowValidation(false);
      },
      [integrationSettings, setIntegrationSettings]
    );

    const onUpdateValidation = useCallback((updatedIsValid: boolean) => {
      setIsValid(updatedIsValid);
    }, []);

    const onShowValidation = useCallback(() => {
      setShowValidation(true);
    }, []);

    const onUpdateNeedsGeneration = useCallback((updatedNeedsGeneration: boolean) => {
      setNeedsGeneration(updatedNeedsGeneration);
    }, []);

    return (
      <EuiFlyout onClose={() => setShowCelCreateFlyout(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiTitle size="m">
              <h2>{i18n.OPEN_API_SPEC_TITLE}</h2>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={flyoutBodyCss}>
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiPanel hasShadow={false} hasBorder={true} paddingSize="m">
              <EuiAccordion
                id={'step1'}
                arrowDisplay="right"
                paddingSize="m"
                forceState={isUploadStepExpanded ? 'open' : 'closed'}
                onToggle={handleToggleStep}
                data-test-subj="celGenStep1"
                buttonContent={
                  <EuiFlexGroup alignItems="center" gutterSize="m">
                    <EuiStepNumber
                      titleSize="s"
                      number={1}
                      status={isAnalyzeApiGenerationComplete ? 'complete' : 'current'}
                    />
                    <EuiTitle size="xs">
                      <h4>{i18n.UPLOAD_SPEC_TITLE}</h4>
                    </EuiTitle>
                  </EuiFlexGroup>
                }
              >
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="m" />
                <UploadSpecStep
                  integrationSettings={integrationSettings}
                  connector={connector}
                  isFlyoutGenerating={isFlyoutGenerating}
                  showValidation={showValidation}
                  onShowValidation={onShowValidation}
                  onUpdateValidation={onUpdateValidation}
                  onUpdateNeedsGeneration={onUpdateNeedsGeneration}
                  onAnalyzeApiGenerationComplete={onAnalyzeApiGenerationComplete}
                />
              </EuiAccordion>
            </EuiPanel>

            <EuiPanel hasShadow={false} hasBorder={true} paddingSize="m">
              <EuiAccordion
                id={'step2'}
                arrowDisplay="right"
                paddingSize="m"
                isDisabled={!isAnalyzeApiGenerationComplete}
                forceState={isConfirmStepExpanded ? 'open' : 'closed'}
                onToggle={handleToggleStep}
                data-test-subj="celGenStep2"
                buttonContent={
                  <EuiFlexGroup alignItems="center" gutterSize="m">
                    <EuiStepNumber
                      titleSize="s"
                      number={2}
                      status={
                        !isAnalyzeApiGenerationComplete
                          ? 'disabled'
                          : completedCelGeneration
                          ? 'complete'
                          : 'current'
                      }
                    />
                    <EuiTitle size="xs">
                      <h4>{i18n.CONFIRM_SETTINGS_TITLE}</h4>
                    </EuiTitle>
                  </EuiFlexGroup>
                }
              >
                {isAnalyzeApiGenerationComplete && (
                  <>
                    <EuiHorizontalRule margin="none" />
                    <ConfirmSettingsStep
                      integrationSettings={integrationSettings}
                      connector={connector}
                      isFlyoutGenerating={isFlyoutGenerating}
                      suggestedPaths={suggestedPaths}
                      showValidation={showValidation}
                      onShowValidation={onShowValidation}
                      onUpdateValidation={onUpdateValidation}
                      onUpdateNeedsGeneration={onUpdateNeedsGeneration}
                      onCelInputGenerationComplete={onCelInputGenerationComplete}
                    />
                  </>
                )}
              </EuiAccordion>
            </EuiPanel>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <Footer
            isFlyoutGenerating={isFlyoutGenerating}
            isValid={!showValidation || (isValid && completedCelGeneration)}
            isGenerationComplete={completedCelGeneration}
            showHint={showValidation && needsGeneration}
            hint={
              isAnalyzeApiGenerationComplete ? i18n.GENERATE_BUTTON_HINT : i18n.ANALYZE_BUTTON_HINT
            }
            onCancel={onCancel}
            onSave={onSaveConfig}
          />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
CreateCelConfigFlyout.displayName = 'CreateCelConfigFlyout';
