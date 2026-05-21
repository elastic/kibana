/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFieldPassword,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSteps,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import type { AwsService } from './aws_services_data';
import {
  getIntegrationConfigFieldsForService,
  selectedServicesNeedIntegrationParameters,
  type AwsServiceIntegrationConfigValues,
} from './aws_catalog_integration_service_config';
import { AwsCatalogIntegrationParameters } from './aws_catalog_integration_parameters';
import {
  AWS_CATALOG_PROTOTYPE_AWS_REGION,
  AWS_CATALOG_PROTOTYPE_ELASTIC_API_TOKEN,
} from './aws_catalog_onboarding_shared';

export interface AwsCatalogConfigurationValues {
  readonly externalId: string;
  readonly kibanaUrl: string;
  readonly elasticApiToken: string;
  readonly awsRegion: string;
  readonly serviceIntegrationConfig: AwsServiceIntegrationConfigValues;
}

export interface AwsCatalogConfigurationStepProps {
  readonly catalog: readonly AwsService[];
  readonly selectedServiceIds: ReadonlySet<string>;
  readonly onCanContinueChange: (canContinue: boolean) => void;
  readonly onValuesChange?: (values: AwsCatalogConfigurationValues) => void;
}

type ElasticConnectionFieldId = 'elasticApiToken' | 'awsRegion';

function generateAwsOnboardingExternalId(): string {
  const suffix = Math.random().toString(36).slice(2, 11);
  return `ela-${suffix}`;
}

function resolveElasticKibanaUrl(basePath: { get: () => string }): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const path = basePath.get();
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  return `${window.location.origin}${normalizedPath}`;
}

function requiredFieldError(fieldLabel: string): string {
  return i18n.translate('xpack.observabilityOnboarding.awsPage.configuration.fieldRequired', {
    defaultMessage: '{fieldLabel} is required.',
    values: { fieldLabel },
  });
}

/** Prototype: copy the top-level region into each selected service that has a regions input. */
function applyTopLevelRegionToServiceConfigs(
  region: string,
  serviceIds: ReadonlySet<string>,
  current: AwsServiceIntegrationConfigValues
): AwsServiceIntegrationConfigValues {
  const trimmedRegion = region.trim();
  if (!trimmedRegion) {
    return current;
  }

  let next: AwsServiceIntegrationConfigValues = current;
  for (const serviceId of serviceIds) {
    const hasRegionsField = getIntegrationConfigFieldsForService(serviceId).some(
      (field) => field.key === 'regions'
    );
    if (!hasRegionsField) {
      continue;
    }

    next = {
      ...next,
      [serviceId]: {
        ...(next[serviceId] ?? {}),
        regions: trimmedRegion,
      },
    };
  }

  return next;
}

export const AwsCatalogConfigurationStep: React.FC<AwsCatalogConfigurationStepProps> = ({
  catalog,
  selectedServiceIds,
  onCanContinueChange,
  onValuesChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const [externalId] = useState(() => generateAwsOnboardingExternalId());
  const kibanaUrl = useMemo(() => resolveElasticKibanaUrl(basePath), [basePath]);

  const [elasticApiToken, setElasticApiToken] = useState(
    () => AWS_CATALOG_PROTOTYPE_ELASTIC_API_TOKEN
  );
  const [awsRegion, setAwsRegion] = useState(() => AWS_CATALOG_PROTOTYPE_AWS_REGION);
  const [serviceIntegrationConfig, setServiceIntegrationConfig] =
    useState<AwsServiceIntegrationConfigValues>(() =>
      applyTopLevelRegionToServiceConfigs(
        AWS_CATALOG_PROTOTYPE_AWS_REGION,
        selectedServiceIds,
        {}
      )
    );
  const [touchedElasticFields, setTouchedElasticFields] = useState<
    ReadonlySet<ElasticConnectionFieldId>
  >(() => new Set());

  const values = useMemo(
    (): AwsCatalogConfigurationValues => ({
      externalId,
      kibanaUrl,
      elasticApiToken,
      awsRegion,
      serviceIntegrationConfig,
    }),
    [awsRegion, elasticApiToken, externalId, kibanaUrl, serviceIntegrationConfig]
  );

  const markElasticFieldTouched = useCallback((fieldId: ElasticConnectionFieldId) => {
    setTouchedElasticFields((previous) => {
      if (previous.has(fieldId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(fieldId);
      return next;
    });
  }, []);

  const elasticApiTokenLabel = i18n.translate(
    'xpack.observabilityOnboarding.awsPage.configuration.elasticApiTokenLabel',
    {
      defaultMessage: 'Elastic API Token',
    }
  );
  const awsRegionLabel = i18n.translate(
    'xpack.observabilityOnboarding.awsPage.configuration.awsRegionLabel',
    {
      defaultMessage: 'AWS Region',
    }
  );

  const elasticApiTokenError = useMemo(() => {
    if (!touchedElasticFields.has('elasticApiToken') || values.elasticApiToken.trim()) {
      return undefined;
    }
    return requiredFieldError(elasticApiTokenLabel);
  }, [elasticApiTokenLabel, touchedElasticFields, values.elasticApiToken]);

  const awsRegionError = useMemo(() => {
    if (!touchedElasticFields.has('awsRegion') || values.awsRegion.trim()) {
      return undefined;
    }
    return requiredFieldError(awsRegionLabel);
  }, [awsRegionLabel, touchedElasticFields, values.awsRegion]);

  const handleAwsRegionChange = useCallback(
    (value: string) => {
      setAwsRegion(value);
      setServiceIntegrationConfig((previous) =>
        applyTopLevelRegionToServiceConfigs(value, selectedServiceIds, previous)
      );
    },
    [selectedServiceIds]
  );

  // Prototype: allow continuing once the top-level AWS Region is set.
  const canContinue = Boolean(values.awsRegion.trim());

  useEffect(() => {
    onCanContinueChange(canContinue);
  }, [canContinue, onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const showIntegrationParameters = selectedServicesNeedIntegrationParameters(selectedServiceIds);
  const connectionDetailsAccordionId = useGeneratedHtmlId({
    prefix: 'streamsAwsCatalogConfigurationConnectionDetails',
  });

  const configurationSubStepsCss = useMemo(
    () => css`
      overflow: visible;
      padding-inline-start: ${euiTheme.size.xs};
      padding-block-start: ${euiTheme.size.xs};

      .euiStep__content {
        margin-block-start: 0 !important;
        padding-block-start: ${euiTheme.size.s} !important;
        margin-inline-start: 0 !important;
        padding-inline-start: calc(${euiTheme.size.base} + ${euiTheme.size.m}) !important;
      }

      .euiStep:not(:last-of-type) {
        padding-block-end: ${euiTheme.size.l};
      }

      .euiStep__titleWrapper {
        gap: ${euiTheme.size.m} !important;
        align-items: center;
      }
    `,
    [euiTheme.size.base, euiTheme.size.l, euiTheme.size.m, euiTheme.size.s, euiTheme.size.xs]
  );

  const configurationSubSteps = useMemo(() => {
    const elasticConnectionTitle = i18n.translate(
      'xpack.streams.dataSources.awsConfiguration.elasticConnectionStep',
      {
        defaultMessage: 'Configure Elastic connection',
      }
    );
    const configureParametersTitle = i18n.translate(
      'xpack.streams.dataSources.awsConfiguration.configureParametersStep',
      {
        defaultMessage: 'Configure parameters',
      }
    );

    const elasticConnectionStepStatus = (values.awsRegion.trim() ? 'complete' : 'current') as const;
    // Prototype: never mark parameters complete from auto-filled regions alone.
    const parametersStepStatus = (values.awsRegion.trim() ? 'current' : 'incomplete') as const;

    const elasticConnectionStepContent = (
        <>
          <EuiForm component="div" fullWidth>
            <EuiAccordion
              id={connectionDetailsAccordionId}
              data-test-subj="streamsAwsCatalogConfigurationConnectionDetailsAccordion"
              initialIsOpen={false}
              borders="none"
              buttonElement="div"
              buttonProps={{ paddingSize: 's' as const }}
              buttonContent={
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.streams.dataSources.awsConfiguration.connectionDetails', {
                      defaultMessage: 'Connection details',
                    })}
                  </strong>
                </EuiText>
              }
              paddingSize="s"
            >
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.configuration.externalIdLabel',
                  {
                    defaultMessage: 'External ID (auto-generated)',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  readOnly
                  value={values.externalId}
                  data-test-subj="awsOnboardingConfigurationExternalId"
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.configuration.kibanaUrlLabel',
                  {
                    defaultMessage: 'Kibana URL',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  readOnly
                  value={values.kibanaUrl}
                  data-test-subj="awsOnboardingConfigurationKibanaUrl"
                />
              </EuiFormRow>
            </EuiAccordion>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={elasticApiTokenLabel}
              isInvalid={Boolean(elasticApiTokenError)}
              error={elasticApiTokenError}
            >
              <EuiFieldPassword
                fullWidth
                type="dual"
                isInvalid={Boolean(elasticApiTokenError)}
                value={elasticApiToken}
                placeholder={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.configuration.elasticApiTokenPlaceholder',
                  {
                    defaultMessage: 'Enter API token',
                  }
                )}
                onChange={(event) => setElasticApiToken(event.target.value)}
                onBlur={() => markElasticFieldTouched('elasticApiToken')}
                data-test-subj="awsOnboardingConfigurationElasticApiToken"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={awsRegionLabel}
              isInvalid={Boolean(awsRegionError)}
              error={awsRegionError}
            >
              <EuiFieldText
                fullWidth
                isInvalid={Boolean(awsRegionError)}
                value={awsRegion}
                placeholder={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.configuration.awsRegionPlaceholder',
                  {
                    defaultMessage: 'e.g. us-east-1',
                  }
                )}
                onChange={(event) => handleAwsRegionChange(event.target.value)}
                onBlur={() => markElasticFieldTouched('awsRegion')}
                data-test-subj="awsOnboardingConfigurationAwsRegion"
              />
            </EuiFormRow>
          </EuiForm>
          {!showIntegrationParameters ? (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <p style={{ margin: 0 }}>
                  {i18n.translate('xpack.observabilityOnboarding.awsPage.configuration.prefillHint', {
                    defaultMessage:
                      'Elastic pre-filled your deployment URL, external ID, API token, and primary AWS region. Review and adjust before continuing.',
                  })}
                </p>
              </EuiText>
            </>
          ) : null}
        </>
    );

    const parametersStepContent = (
      <>
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0 }}>
            {i18n.translate('xpack.observabilityOnboarding.awsPage.integrationParameters.subtitle', {
              defaultMessage: 'Required settings for the integrations you selected.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <AwsCatalogIntegrationParameters
          catalog={catalog}
          selectedServiceIds={selectedServiceIds}
          values={serviceIntegrationConfig}
          onValuesChange={setServiceIntegrationConfig}
          hideSectionHeader
        />
      </>
    );

    return {
      elasticConnectionTitle,
      configureParametersTitle,
      elasticConnectionStepStatus,
      parametersStepStatus,
      elasticConnectionStepContent,
      parametersStepContent,
    };
  }, [
    awsRegion,
    awsRegionError,
    awsRegionLabel,
    catalog,
    connectionDetailsAccordionId,
    elasticApiToken,
    elasticApiTokenError,
    elasticApiTokenLabel,
    handleAwsRegionChange,
    markElasticFieldTouched,
    selectedServiceIds,
    serviceIntegrationConfig,
    showIntegrationParameters,
    values.awsRegion,
    values.externalId,
    values.kibanaUrl,
  ]);

  const configurationSubStepsList = useMemo(() => {
    const steps = [
      {
        step: 1,
        title: configurationSubSteps.elasticConnectionTitle,
        status: configurationSubSteps.elasticConnectionStepStatus,
        'data-test-subj': 'streamsAwsCatalogConfigurationSubStep-elasticConnection',
        children: configurationSubSteps.elasticConnectionStepContent,
      },
    ];

    if (showIntegrationParameters) {
      steps.push({
        step: 2,
        title: configurationSubSteps.configureParametersTitle,
        status: configurationSubSteps.parametersStepStatus,
        'data-test-subj': 'streamsAwsCatalogConfigurationSubStep-parameters',
        children: configurationSubSteps.parametersStepContent,
      });
    }

    return steps;
  }, [configurationSubSteps, showIntegrationParameters]);

  return (
    <div data-test-subj="streamsAwsCatalogConfigurationStep">
      <EuiSteps
        titleSize="xs"
        headingElement="h4"
        data-test-subj="streamsAwsCatalogConfigurationSubSteps"
        css={configurationSubStepsCss}
        steps={configurationSubStepsList}
      />
    </div>
  );
};
