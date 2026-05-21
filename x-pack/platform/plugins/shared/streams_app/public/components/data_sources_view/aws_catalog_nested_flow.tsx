/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiStep,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { setIngestHubAwsLogsDemoActive } from '../ingest_hub_aws_logs_demo_data';
import {
  AWS_CATALOG_INTEGRATION_HEADER_LOGO_FRAME_PX,
  awsCatalogModalContentPadding,
} from './aws_catalog_integration_header';
import {
  AwsCatalogConfigurationStep,
  type AwsCatalogConfigurationValues,
} from './aws_catalog_configuration_step';
import { AwsCatalogDeliveryStreamConfigurationStep } from './aws_catalog_delivery_stream_configuration_step';
import { AwsCatalogSeeDataStep } from './aws_catalog_see_data_step';
import { AwsCatalogTestConnectionStep } from './aws_catalog_test_connection_step';
import { AwsModalSelectServicesStep } from './aws_modal_select_services_step';
import {
  AWS_SERVICES_VERSION1_MATRIX,
  AWS_VERSION1_LOGS_ID_SET,
} from './aws_services_data';

/** Prototype delay before treating Connect as successful. */
const AWS_CATALOG_CONNECT_SUCCESS_DELAY_MS = 1200;

const WIZARD_STEP_TITLES = [
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.step.selectServices', {
    defaultMessage: 'Select services',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.step.configuration', {
    defaultMessage: 'Configuration',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.step.deliveryStream', {
    defaultMessage: 'Delivery config',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.step.testConnection', {
    defaultMessage: 'Test connection',
  }),
] as const;

const RIGHT_PANEL_TITLES = [
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.panelTitle.selectServices', {
    defaultMessage: 'Browse and pick your AWS services',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.panelTitle.configuration', {
    defaultMessage: 'Configure your Elastic connection',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.panelTitle.deliveryStream', {
    defaultMessage: 'Configure your delivery',
  }),
  i18n.translate('xpack.streams.dataSources.awsNestedFlow.panelTitle.testConnection', {
    defaultMessage: 'Test your connection',
  }),
] as const;

export interface AwsCatalogNestedFlowProps {
  onBackToCatalogue: () => void;
}

export const AwsCatalogNestedFlow: React.FC<AwsCatalogNestedFlowProps> = ({
  onBackToCatalogue,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    core: { application },
  } = useKibana();
  const [stepIndex, setStepIndex] = useState(0);
  const [manualServiceIds, setManualServiceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [configurationStepCanContinue, setConfigurationStepCanContinue] = useState(false);
  const [deliveryStepCanContinue, setDeliveryStepCanContinue] = useState(false);
  const [testConnectionCanTest, setTestConnectionCanTest] = useState(false);
  const [connectionSucceeded, setConnectionSucceeded] = useState(false);
  const [configurationValues, setConfigurationValues] =
    useState<AwsCatalogConfigurationValues | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectTimeoutRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current !== undefined) {
        window.clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

  const sidebarStepsCss = useMemo(
    () => css`
      padding-inline-start: max(
        0px,
        calc(${AWS_CATALOG_INTEGRATION_HEADER_LOGO_FRAME_PX / 2}px - (${euiTheme.size.base} / 2))
      );
      padding-inline-end: 0;
      /* Room for the current-step icon scale(1.1) so it is not clipped by overflow:hidden parents */
      padding-block-start: max(
        ${euiTheme.size.xs},
        calc((${euiTheme.size.base} * 0.1) / 2)
      );
      overflow: visible;

      .euiStep__content {
        display: none !important;
        margin-block-start: 0 !important;
        margin-block-end: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
      }

      .euiStep:not(:last-of-type) {
        padding-block-end: ${euiTheme.size.m};
      }

      .euiStep:not(:last-of-type)::before {
        border-left-color: ${euiTheme.colors.borderBaseSubdued};
      }

      .euiStep__titleWrapper {
        gap: ${euiTheme.size.m} !important;
        align-items: center;
      }

      .euiStep__title {
        font-weight: ${euiTheme.font.weight.medium} !important;
      }
    `,
    [euiTheme]
  );

  /** Configuration and delivery steps render their own titled EuiSteps — omit duplicate panel headings. */
  const hideContentPanelTitle = stepIndex === 1 || stepIndex === 2;

  const stepContentAreaCss = useMemo(
    () => css`
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding-block-start: ${hideContentPanelTitle ? 0 : euiTheme.size.m};
      overflow-x: ${hideContentPanelTitle ? 'visible' : 'hidden'};
      overflow-y: auto;
    `,
    [euiTheme.size.m, hideContentPanelTitle]
  );

  const wizardFooterCss = useMemo(
    () => css`
      flex-shrink: 0;
      margin-block-start: auto;
      padding-block-start: ${euiTheme.size.m};
      padding-inline: 0;
    `,
    [euiTheme.size.m]
  );

  const canContinueStep0 = manualServiceIds.size > 0;

  const isDeliveryStreamStep = stepIndex === 2;
  const isTestConnectionStep = stepIndex === 3;
  const primaryActionEnabled = isTestConnectionStep
    ? connectionSucceeded
    : isDeliveryStreamStep
    ? deliveryStepCanContinue
    : stepIndex === 0
    ? canContinueStep0
    : stepIndex === 1
    ? configurationStepCanContinue
    : true;

  const onBack = useCallback(() => {
    if (isConnecting) {
      return;
    }
    if (stepIndex > 0) {
      if (stepIndex === 3) {
        setConnectionSucceeded(false);
      }
      setStepIndex((i) => i - 1);
    }
  }, [isConnecting, stepIndex]);

  const onTestConnection = useCallback(() => {
    if (!testConnectionCanTest || isConnecting || connectionSucceeded) {
      return;
    }
    setIsConnecting(true);
    connectTimeoutRef.current = window.setTimeout(() => {
      setIsConnecting(false);
      setConnectionSucceeded(true);
    }, AWS_CATALOG_CONNECT_SUCCESS_DELAY_MS);
  }, [connectionSucceeded, isConnecting, testConnectionCanTest]);

  const onSeeData = useCallback(() => {
    if (!connectionSucceeded) {
      return;
    }
    setIngestHubAwsLogsDemoActive(true);
    void application.navigateToApp('streams', {
      path: '/?rangeFrom=now-15m&rangeTo=now',
    });
    onBackToCatalogue();
  }, [application, connectionSucceeded, onBackToCatalogue]);

  const onContinue = useCallback(() => {
    if (!primaryActionEnabled) {
      return;
    }
    if (isTestConnectionStep) {
      onSeeData();
      return;
    }
    if (stepIndex < WIZARD_STEP_TITLES.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }, [isTestConnectionStep, onSeeData, primaryActionEnabled, stepIndex]);

  const primaryButtonLabel = useMemo(() => {
    if (isTestConnectionStep) {
      return i18n.translate('xpack.streams.dataSources.awsNestedFlow.seeData', {
        defaultMessage: 'See data',
      });
    }
    return i18n.translate('xpack.streams.dataSources.awsNestedFlow.continue', {
      defaultMessage: 'Continue',
    });
  }, [isTestConnectionStep]);

  const handleConfigurationValuesChange = useCallback((values: AwsCatalogConfigurationValues) => {
    setConfigurationValues(values);
  }, []);

  const renderStepBody = () => {
    if (stepIndex === 0) {
      return (
        <AwsModalSelectServicesStep
          catalog={AWS_SERVICES_VERSION1_MATRIX}
          logsServiceIdSet={AWS_VERSION1_LOGS_ID_SET}
          manualServiceIds={manualServiceIds}
          onSetManualServiceIds={setManualServiceIds}
          fillAvailableHeight
        />
      );
    }
    if (stepIndex === 1) {
      return (
        <AwsCatalogConfigurationStep
          catalog={AWS_SERVICES_VERSION1_MATRIX}
          selectedServiceIds={manualServiceIds}
          onCanContinueChange={setConfigurationStepCanContinue}
          onValuesChange={handleConfigurationValuesChange}
        />
      );
    }
    if (stepIndex === 2) {
      return (
        <AwsCatalogDeliveryStreamConfigurationStep
          deployExternalId={configurationValues?.externalId ?? ''}
          elasticEndpoint={configurationValues?.kibanaUrl ?? ''}
          elasticApiKey={configurationValues?.elasticApiToken}
          awsRegion={configurationValues?.awsRegion}
          onCanContinueChange={setDeliveryStepCanContinue}
        />
      );
    }
    return (
      <AwsCatalogTestConnectionStep
        catalog={AWS_SERVICES_VERSION1_MATRIX}
        selectedServiceIds={manualServiceIds}
        isTestingConnection={isConnecting}
        testConnectionSucceeded={connectionSucceeded}
        onCanTestConnectionChange={setTestConnectionCanTest}
        onTestConnection={onTestConnection}
        onSeeData={onSeeData}
      />
    );
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
        width: 100%;
        height: 100%;
      `}
      data-test-subj="streamsAwsCatalogNestedFlow"
    >
      <EuiFlexGroup
        gutterSize="none"
        alignItems="stretch"
        responsive={false}
        css={css`
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
          width: 100%;
          align-self: stretch;
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            flex: 0 0 auto;
            width: max-content;
            max-width: 100%;
            align-self: stretch;
            display: flex;
            flex-direction: column;
            padding-inline-end: ${awsCatalogModalContentPadding(euiTheme)};
            background-color: ${euiTheme.colors.backgroundBasePlain};
            overflow: visible;
          `}
        >
          <div
            css={css`
              position: sticky;
              top: 0;
              z-index: 1;
              overflow: visible;
            `}
          >
            <div className="euiSteps" css={sidebarStepsCss}>
              {WIZARD_STEP_TITLES.map((stepTitle, i) => {
                const isPast = i < stepIndex;
                const isCurrent = i === stepIndex;
                const status = isPast ? 'complete' : isCurrent ? 'current' : 'disabled';
                return (
                  <EuiStep
                    key={stepTitle}
                    aria-current={isCurrent ? 'step' : undefined}
                    data-test-subj={`streamsAwsCatalogNestedStep-${i}`}
                    step={i + 1}
                    title={stepTitle}
                    titleSize="xxs"
                    headingElement="h3"
                    status={status}
                    onClick={
                      isPast && !isConnecting && !connectionSucceeded
                        ? () => {
                            setStepIndex(i);
                            if (i < 3) {
                              setConnectionSucceeded(false);
                            }
                          }
                        : undefined
                    }
                    onKeyDown={
                      isPast && !isConnecting && !connectionSucceeded
                        ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setStepIndex(i);
                              if (i < 3) {
                                setConnectionSucceeded(false);
                              }
                            }
                          }
                        : undefined
                    }
                    tabIndex={isPast && !isConnecting && !connectionSucceeded ? 0 : undefined}
                    role={isPast && !isConnecting && !connectionSucceeded ? 'button' : undefined}
                    css={
                      isPast && !isConnecting && !connectionSucceeded
                        ? css`
                            cursor: pointer;
                            &:focus-visible {
                              outline: 2px solid ${euiTheme.colors.primary};
                              outline-offset: 2px;
                            }
                          `
                        : undefined
                    }
                  >
                    <></>
                  </EuiStep>
                );
              })}
            </div>
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-self: stretch;
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            css={css`
              align-self: stretch;
              flex: 1 1 auto;
              min-height: 0;
              inline-size: ${euiTheme.border.width.thin};
              flex-shrink: 0;
              background-color: ${euiTheme.colors.borderBaseSubdued};
            `}
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            flex: 1 1 0%;
            min-width: 0;
            min-height: 0;
            padding-inline-start: ${awsCatalogModalContentPadding(euiTheme)};
            display: flex;
            flex-direction: column;
          `}
        >
          <div
            css={css`
              flex: 1 1 auto;
              min-height: 0;
              height: 100%;
              display: flex;
              flex-direction: column;
              padding-inline-end: 0;
            `}
          >
            {hideContentPanelTitle ? null : (
              <EuiTitle
                size="xs"
                data-test-subj="streamsAwsCatalogNestedContentTitle"
                css={css`
                  flex-shrink: 0;
                  h3 {
                    margin-block-end: 0;
                  }
                `}
              >
                <h3>{RIGHT_PANEL_TITLES[stepIndex]}</h3>
              </EuiTitle>
            )}
            <div
              css={stepContentAreaCss}
              data-test-subj={`streamsAwsCatalogNestedStepContent-${stepIndex}`}
            >
              {renderStepBody()}
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <footer css={wizardFooterCss} data-test-subj="streamsAwsCatalogNestedFooter">
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          justifyContent="flexEnd"
          responsive={false}
          css={css`
            padding-block-start: ${awsCatalogModalContentPadding(euiTheme)};
          `}
        >
          {stepIndex > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="m"
                iconType="arrowLeft"
                onClick={onBack}
                disabled={isConnecting}
                data-test-subj="streamsAwsCatalogNestedBack"
              >
                {i18n.translate('xpack.streams.dataSources.awsNestedFlow.back', {
                  defaultMessage: 'Back',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              size="m"
              disabled={!primaryActionEnabled}
              isLoading={isTestConnectionStep ? false : isConnecting}
              onClick={onContinue}
              data-test-subj={
                isTestConnectionStep
                  ? 'streamsAwsCatalogNestedSeeData'
                  : 'streamsAwsCatalogNestedContinue'
              }
            >
              {primaryButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </footer>
    </div>
  );
};
