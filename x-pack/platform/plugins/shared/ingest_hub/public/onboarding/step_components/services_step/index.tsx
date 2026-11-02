/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { useLocation } from 'react-router-dom';

import { ServiceRow } from './service_row';
import { SIGNAL_TYPE_LABELS } from './signal_type_badge';
import { useServicesStep } from './use_services_step';
import { ServiceSearchFilter } from '../service_search_filter';
import { DataSchemaSection } from './data_schema_section';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { StepFooter } from '../step_footer';

interface ServicesStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function ServicesStep({ onContinue, onBack }: ServicesStepProps) {
  const {
    signalFilter,
    setSignalFilter,
    searchQuery,
    setSearchQuery,
    filteredServices,
    duplicateNames,
    selectedSet,
    isReady,
    handleToggle,
    allVisibleSelected,
    handleSelectAllVisible,
    handleDeselectAllVisible,
    handleNext,
    dataFormat,
    setDataFormat,
    agentBasedOnlySelected,
    ecfOnlySelected,
    isUnavailableForMethod,
  } = useServicesStep({ onContinue });

  const { detectAndReviewStep, defaultDataFormat } = useOnboardingFlow();
  const unavailableForMethodReason = i18n.translate(
    'xpack.ingestHub.servicesStep.ecfOnlyDisabledTooltip',
    {
      defaultMessage:
        "Agent-based deployment doesn't support this service. Switch to Elastic Managed Integrations to select it.",
    }
  );
  const location = useLocation();
  // Lock format when in edit mode (SO persisted) OR when deploy has started without a persisted SO
  // (SO create is best-effort — policies may exist even if ?deploymentId= was never added to URL).
  const isFormatDisabled =
    new URLSearchParams(location.search).has('deploymentId') ||
    Object.keys(detectAndReviewStep.serviceStatuses).length > 0 ||
    Object.keys(detectAndReviewStep.policyIdsByInstance).length > 0;

  return (
    <div data-test-subj="onboardingStep-services">
      <DataSchemaSection
        dataFormat={dataFormat}
        onChange={setDataFormat}
        disabled={isFormatDisabled}
        recommendedFormat={defaultDataFormat}
      />
      <EuiSpacer size="xl" />
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.title"
            defaultMessage="Which AWS services do you want to monitor?"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.subtitle"
            defaultMessage="Select the services you use. Elastic will set up everything needed to start collecting data from your AWS account."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      {agentBasedOnlySelected.length > 0 && (
        <>
          <KbnWarningCallout
            announceOnMount
            title={i18n.translate('xpack.ingestHub.servicesStep.agentBasedOnlyCallout.title', {
              defaultMessage: 'Some services require a self-managed Elastic Agent',
            })}
            text={
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.servicesStep.agentBasedOnlyCallout.body"
                  defaultMessage="{services} {count, plural, one {does} other {do}} not support Managed Integrations and can only be collected via a self-managed Elastic Agent. You will configure this in the next steps."
                  values={{
                    count: agentBasedOnlySelected.length,
                    services: (
                      <strong>{agentBasedOnlySelected.map((s) => s.name).join(', ')}</strong>
                    ),
                  }}
                />
              </p>
            }
            data-test-subj="servicesStep-agentBasedOnlyCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {ecfOnlySelected.length > 0 && (
        <>
          <KbnWarningCallout
            announceOnMount
            title={i18n.translate('xpack.ingestHub.servicesStep.ecfOnlyCallout.title', {
              defaultMessage: 'Some services do not support agent-based deployment',
            })}
            text={
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.servicesStep.ecfOnlyCallout.body"
                  defaultMessage="{services} can only be deployed through Elastic Cloud Forwarder. If you choose agent-based deployment in a later step, {count, plural, one {it is} other {they are}} removed from your selection."
                  values={{
                    count: ecfOnlySelected.length,
                    services: <strong>{ecfOnlySelected.map((s) => s.name).join(', ')}</strong>,
                  }}
                />
              </p>
            }
            data-test-subj="servicesStep-ecfOnlyCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      <ServiceSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        signalFilter={signalFilter}
        onSignalFilterChange={setSignalFilter}
        searchTestSubj="servicesStep-searchBox"
        filterTestSubj="servicesStep-signalFilter"
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="servicesStep-selectedCount">
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.selectedCount"
              defaultMessage="{count, plural, =0 {None selected} other {# selected}}"
              values={{ count: selectedSet.size }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {allVisibleSelected ? (
            <EuiButtonEmpty
              size="s"
              onClick={handleDeselectAllVisible}
              data-test-subj="servicesStep-deselectAllButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.servicesStep.deselectAll"
                defaultMessage="Deselect all"
              />
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty
              size="s"
              onClick={handleSelectAllVisible}
              data-test-subj="servicesStep-selectAllButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.servicesStep.selectAll"
                defaultMessage="Select all"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="m" hasBorder>
        {filteredServices.length > 0 ? (
          <EuiFlexGrid columns={2} gutterSize="m">
            {filteredServices.map((service) => (
              <EuiFlexItem key={service.id}>
                <ServiceRow
                  service={service}
                  isSelected={selectedSet.has(service.id)}
                  onToggle={handleToggle}
                  disabledReason={
                    isUnavailableForMethod(service) ? unavailableForMethodReason : undefined
                  }
                  displayName={
                    duplicateNames.has(service.name)
                      ? `${service.name} ${service.signalTypes
                          .map((t) => SIGNAL_TYPE_LABELS[t])
                          .join(' & ')}`
                      : undefined
                  }
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        ) : (
          <EuiText size="s" color="subdued" textAlign="center" data-test-subj="servicesStep-empty">
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.noServices"
              defaultMessage="No services match your search."
            />
          </EuiText>
        )}
      </EuiPanel>

      <StepFooter onBack={onBack}>
        <EuiButton
          fill
          onClick={handleNext}
          isDisabled={!isReady}
          data-test-subj="servicesStep-continueButton"
        >
          <FormattedMessage id="xpack.ingestHub.servicesStep.nextButton" defaultMessage="Next" />
        </EuiButton>
      </StepFooter>
    </div>
  );
}
