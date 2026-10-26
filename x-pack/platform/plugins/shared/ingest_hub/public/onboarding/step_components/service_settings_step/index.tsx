/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import {
  DEFAULT_NAMESPACE,
  getSourcePolicyName,
} from '../authenticate_and_deploy_step/deploy_group_helpers';
import { supportsIntegrationSettings } from './integration_settings';
import { getRegionFieldName, hasConfigurableFlyoutFields } from './field_config';
import type { ServiceInstance } from './use_service_settings';
import { useServiceSettings } from './use_service_settings';
import { ServiceSettingsFlyout } from './service_settings_flyout';
import { SharedSettingsSection } from './shared_settings_section';
import { DuplicateServiceModal } from './duplicate_service_modal';
import { SignalTypeBadge } from '../services_step/signal_type_badge';
import { ServiceSearchFilter } from '../service_search_filter';
import { buildDuplicateName } from './duplicate_name';
import type { SignalFilter } from '../services_step/use_services_step';
import { StepFooter } from '../step_footer';

interface ServiceSettingsStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function ServiceSettingsStep({ onContinue, onBack }: ServiceSettingsStepProps) {
  const {
    globalRegion,
    setGlobalRegion,
    integrationName,
    setIntegrationName,
    integrationNameError,
    description,
    setDescription,
    descriptionError,
    bareNamePackage,
    instances,
    filteredInstances,
    incompleteInstances,
    incompleteInstanceIds,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    getServiceVars,
    setServiceFieldsAndInputs,
    addDuplicate,
    removeInstance,
    allInstanceNames,
    globalRegionTouched,
    setGlobalRegionTouched,
    isReady,
    handleNext,
  } = useServiceSettings({ onContinue });

  const {
    awsServicesMap,
    detectAndReviewStep,
    servicesStep,
    refetchAwsServiceMatrix,
    deploymentMethod,
  } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  // Gate Next on optional package manifests that are still in-flight or have errored.
  // Errored manifests must also block here: an error leaves dataStreams/vars empty, so
  // incompleteInstances would report nothing missing even though required fields aren't loaded.
  const hasUnloadedSelectedManifests = selectedServiceIds.some((id) => {
    const entry = awsServicesMap?.get(id);
    return entry && !entry.isManifestLoaded && !entry.isManifestError;
  });
  const hasErroredSelectedManifests = selectedServiceIds.some((id) => {
    const entry = awsServicesMap?.get(id);
    return entry?.isManifestError === true;
  });

  const isRegionDisabled =
    Object.keys(detectAndReviewStep.policyIdsByInstance).length > 0 ||
    Object.values(detectAndReviewStep.serviceStatuses).some(
      (s) => s !== 'error' && s !== 'timeout'
    );

  const [activeFlyoutInstanceId, setActiveFlyoutInstanceId] = useState<string | null>(null);
  const [duplicateSourceInstanceId, setDuplicateSourceInstanceId] = useState<string | null>(null);
  const [openMenuInstanceId, setOpenMenuInstanceId] = useState<string | null>(null);

  const activeFlyoutInstance = activeFlyoutInstanceId
    ? instances.find((i) => i.instanceId === activeFlyoutInstanceId) ?? null
    : null;
  const activeFlyoutService = activeFlyoutInstance
    ? awsServicesMap?.get(activeFlyoutInstance.serviceId) ?? null
    : null;

  const duplicateSourceInstance = duplicateSourceInstanceId
    ? instances.find((i) => i.instanceId === duplicateSourceInstanceId) ?? null
    : null;
  const duplicateSourceService = duplicateSourceInstance
    ? awsServicesMap?.get(duplicateSourceInstance.serviceId) ?? null
    : null;

  const handleFlyoutApply =
    (instanceId: string) =>
    (
      varsByDataStream: Record<string, import('./use_service_settings').ServiceDataStreamVars>,
      enabledDataStreams: string[],
      namespace: string
    ) => {
      setServiceFieldsAndInputs(instanceId, varsByDataStream, enabledDataStreams, namespace);
      setActiveFlyoutInstanceId(null);
    };

  const handleDuplicateAdd = (
    name: string,
    varsByDataStream: Record<string, import('./use_service_settings').ServiceDataStreamVars>,
    enabledDataStreams: string[],
    namespace: string
  ) => {
    if (!duplicateSourceInstanceId) return;
    addDuplicate(duplicateSourceInstanceId, name, varsByDataStream, enabledDataStreams, namespace);
    setDuplicateSourceInstanceId(null);
  };

  const continueTooltipContent = useMemo(() => {
    if (isReady && !hasUnloadedSelectedManifests && !hasErroredSelectedManifests) return undefined;
    const reasons: string[] = [];
    if (hasErroredSelectedManifests) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.erroredManifests', {
          defaultMessage: 'Service details failed to load — retry to continue',
        })
      );
    } else if (hasUnloadedSelectedManifests) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.loadingManifests', {
          defaultMessage: 'Loading service details',
        })
      );
    }
    if (!globalRegion.trim()) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.noRegion', {
          defaultMessage: 'Set a global region',
        })
      );
    }
    if (integrationNameError || descriptionError) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.integrationSettings', {
          defaultMessage: 'Fix the integration settings',
        })
      );
    }
    if (incompleteInstances.length > 0) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.incompleteServices', {
          defaultMessage:
            '{count, plural, one {# service needs configuration} other {# services need configuration}}',
          values: { count: incompleteInstances.length },
        })
      );
    }
    return reasons.join(' · ');
  }, [
    isReady,
    hasUnloadedSelectedManifests,
    hasErroredSelectedManifests,
    globalRegion,
    integrationNameError,
    descriptionError,
    incompleteInstances,
  ]);

  const columns: Array<EuiBasicTableColumn<ServiceInstance>> = useMemo(
    () => [
      {
        width: '32px',
        render: (inst: ServiceInstance) =>
          incompleteInstanceIds.has(inst.instanceId) ? (
            <EuiIconTip
              type="warning"
              color="warning"
              content={i18n.translate(
                'xpack.ingestHub.serviceSettingsStep.table.attentionTooltip',
                { defaultMessage: 'Required configuration missing' }
              )}
              anchorProps={{
                'data-test-subj': `serviceSettingsStep-attentionIcon-${inst.instanceId}`,
              }}
            />
          ) : null,
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.serviceName', {
          defaultMessage: 'Service Name',
        }),
        render: (inst: ServiceInstance) => {
          const service = awsServicesMap?.get(inst.serviceId);
          const canConfigure = service ? hasConfigurableFlyoutFields(service) : false;
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {canConfigure && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.ingestHub.serviceSettingsStep.table.editAriaLabel',
                      { defaultMessage: 'Edit {name}', values: { name: inst.name } }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="maximize"
                      size="xs"
                      color="text"
                      onClick={() => setActiveFlyoutInstanceId(inst.instanceId)}
                      aria-label={i18n.translate(
                        'xpack.ingestHub.serviceSettingsStep.table.editAriaLabel',
                        { defaultMessage: 'Edit {name}', values: { name: inst.name } }
                      )}
                      data-test-subj={`serviceSettingsStep-editButton-${inst.instanceId}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                {canConfigure ? (
                  <EuiButtonEmpty
                    size="xs"
                    flush="left"
                    onClick={() => setActiveFlyoutInstanceId(inst.instanceId)}
                    data-test-subj={`serviceSettingsStep-serviceLink-${inst.instanceId}`}
                  >
                    {inst.name}
                  </EuiButtonEmpty>
                ) : (
                  <EuiText
                    size="s"
                    data-test-subj={`serviceSettingsStep-serviceLink-${inst.instanceId}`}
                  >
                    {inst.name}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        sortable: (inst: ServiceInstance) => inst.name,
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.collects', {
          defaultMessage: 'Collects',
        }),
        render: (inst: ServiceInstance) => {
          const service = awsServicesMap?.get(inst.serviceId);
          return service ? <SignalTypeBadge signalTypes={service.signalTypes} /> : null;
        },
        sortable: (inst: ServiceInstance) =>
          awsServicesMap?.get(inst.serviceId)?.signalTypes.join(',') ?? '',
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.region', {
          defaultMessage: 'Region',
        }),
        render: (inst: ServiceInstance) => {
          const service = awsServicesMap?.get(inst.serviceId);
          if (!service) return null;
          const config = getServiceVars(inst.instanceId);
          // Find the first enabled input across all data streams for region display.
          let override: string | undefined;
          for (const dsId of service.dataStreams) {
            const dsVars = config.varsByDataStream[dsId];
            const inp = dsVars?.enabledInputs?.[0];
            if (inp) {
              const regionField = getRegionFieldName(service, inp);
              const rawRegion = dsVars.varsByInput?.[inp]?.[regionField];
              override = (Array.isArray(rawRegion) ? rawRegion[0] : rawRegion)?.trim() || undefined;
              break;
            }
          }
          if (override) return override;
          if (globalRegion) return globalRegion;
          return (
            <EuiText size="s" color="subdued">
              —
            </EuiText>
          );
        },
      },
      {
        width: '40px',
        render: (inst: ServiceInstance) => {
          const service = awsServicesMap?.get(inst.serviceId);
          const isEcfOnly = service?.settingsScope === 'ecf';
          if (isEcfOnly && !inst.isDuplicate) return null;
          const isOpen = openMenuInstanceId === inst.instanceId;
          const actionsLabel = i18n.translate(
            'xpack.ingestHub.serviceSettingsStep.table.actionsAriaLabel',
            {
              defaultMessage: 'Actions for {name}',
              values: { name: inst.name },
            }
          );
          return (
            <EuiPopover
              button={
                <EuiToolTip content={actionsLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    size="xs"
                    color="text"
                    onClick={() => setOpenMenuInstanceId(isOpen ? null : inst.instanceId)}
                    aria-label={actionsLabel}
                    data-test-subj={`serviceSettingsStep-actionsButton-${inst.instanceId}`}
                  />
                </EuiToolTip>
              }
              isOpen={isOpen}
              closePopover={() => setOpenMenuInstanceId(null)}
              aria-label={actionsLabel}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel
                items={[
                  ...(!isEcfOnly
                    ? [
                        <EuiContextMenuItem
                          key="duplicate"
                          icon="copy"
                          onClick={() => {
                            setOpenMenuInstanceId(null);
                            setDuplicateSourceInstanceId(inst.instanceId);
                          }}
                          data-test-subj={`serviceSettingsStep-duplicateAction-${inst.instanceId}`}
                        >
                          <FormattedMessage
                            id="xpack.ingestHub.serviceSettingsStep.table.action.duplicate"
                            defaultMessage="Duplicate service"
                          />
                        </EuiContextMenuItem>,
                      ]
                    : []),
                  ...(inst.isDuplicate
                    ? [
                        <EuiContextMenuItem
                          key="remove"
                          icon="trash"
                          onClick={() => {
                            setOpenMenuInstanceId(null);
                            removeInstance(inst.instanceId);
                          }}
                          data-test-subj={`serviceSettingsStep-removeAction-${inst.instanceId}`}
                        >
                          <FormattedMessage
                            id="xpack.ingestHub.serviceSettingsStep.table.action.remove"
                            defaultMessage="Remove"
                          />
                        </EuiContextMenuItem>,
                      ]
                    : []),
                ]}
              />
            </EuiPopover>
          );
        },
      },
    ],
    [
      awsServicesMap,
      getServiceVars,
      globalRegion,
      incompleteInstanceIds,
      openMenuInstanceId,
      removeInstance,
    ]
  );

  return (
    <div data-test-subj="onboardingStep-service-settings">
      <EuiFlexGroup alignItems="flexStart" gutterSize="l" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.title"
                defaultMessage="Service settings"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.subtitle"
                defaultMessage="Configure each selected service."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <SharedSettingsSection
        integrationName={integrationName}
        onIntegrationNameChange={setIntegrationName}
        integrationNameError={integrationNameError}
        description={description}
        onDescriptionChange={setDescription}
        descriptionError={descriptionError}
        globalRegion={globalRegion}
        onGlobalRegionChange={setGlobalRegion}
        globalRegionTouched={globalRegionTouched}
        onGlobalRegionTouched={() => setGlobalRegionTouched(true)}
        isGlobalRegionDisabled={isRegionDisabled}
      />
      <EuiSpacer size="m" />

      {hasErroredSelectedManifests && (
        <>
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.manifestErrorCallout.title"
                defaultMessage="Could not load service details"
              />
            }
            iconType="warning"
            color="danger"
            data-test-subj="serviceSettingsStep-manifestErrorCallout"
          >
            <p>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.manifestErrorCallout.body"
                defaultMessage="One or more integration packages could not be loaded. Retry to continue."
              />
            </p>
            <EuiButton
              size="s"
              color="danger"
              onClick={refetchAwsServiceMatrix}
              data-test-subj="serviceSettingsStep-manifestRetryButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.manifestErrorCallout.retryButton"
                defaultMessage="Retry"
              />
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {incompleteInstances.length > 0 && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.ingestHub.serviceSettingsStep.attentionCallout.title', {
              defaultMessage: 'Some services need your input',
            })}
            data-test-subj="serviceSettingsStep-attentionCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      <ServiceSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        signalFilter={signalFilter as SignalFilter}
        onSignalFilterChange={setSignalFilter}
        searchTestSubj="serviceSettingsStep-searchBox"
        filterTestSubj="serviceSettingsStep-signalFilter"
      />

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ingestHub.serviceSettingsStep.serviceCount"
          defaultMessage="Showing {count} {count, plural, one {service} other {services}}"
          values={{ count: <strong>{filteredInstances.length}</strong> }}
        />
      </EuiText>

      <EuiSpacer size="s" />

      <EuiInMemoryTable
        items={filteredInstances}
        columns={columns}
        sorting={true}
        tableLayout="auto"
        tableCaption={i18n.translate('xpack.ingestHub.serviceSettingsStep.table.caption', {
          defaultMessage: 'Selected AWS services configuration',
        })}
        data-test-subj="serviceSettingsStep-table"
      />

      <StepFooter onBack={onBack}>
        <EuiToolTip content={continueTooltipContent}>
          {/* span needed: disabled <button> swallows pointer events, span intercepts them for the tooltip */}
          <span tabIndex={0} style={{ display: 'inline-block' }}>
            <EuiButton
              fill
              onClick={handleNext}
              disabled={!isReady || hasUnloadedSelectedManifests || hasErroredSelectedManifests}
              isLoading={hasUnloadedSelectedManifests}
              data-test-subj="serviceSettingsStep-continueButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.nextButton"
                defaultMessage="Next"
              />
            </EuiButton>
          </span>
        </EuiToolTip>
      </StepFooter>

      {activeFlyoutService && activeFlyoutInstance && (
        <ServiceSettingsFlyout
          service={activeFlyoutService}
          config={getServiceVars(activeFlyoutInstance.instanceId)}
          globalRegion={globalRegion}
          isNamespaceLocked={
            !!detectAndReviewStep.policyIdsByInstance[activeFlyoutInstance.instanceId]
          }
          // Managed integrations put an empty namespace on `default`.
          resolvedEmptyNamespace={
            deploymentMethod === 'managed_integration' ? DEFAULT_NAMESPACE : undefined
          }
          onApply={handleFlyoutApply(activeFlyoutInstance.instanceId)}
          onClose={() => setActiveFlyoutInstanceId(null)}
        />
      )}

      {duplicateSourceService && duplicateSourceInstance && (
        <DuplicateServiceModal
          service={duplicateSourceService}
          sourceConfig={getServiceVars(duplicateSourceInstance.instanceId)}
          suggestedName={buildDuplicateName(
            // The service name is the duplicate's policy name, so it starts from the name of the
            // policy the service is deployed into.
            integrationName.trim() &&
              supportsIntegrationSettings(duplicateSourceService, deploymentMethod)
              ? getSourcePolicyName(
                  integrationName,
                  duplicateSourceService.packageName,
                  getServiceVars(duplicateSourceInstance.instanceId).namespace,
                  bareNamePackage
                )
              : duplicateSourceService.name,
            allInstanceNames
          )}
          existingNames={allInstanceNames}
          globalRegion={globalRegion}
          onAdd={handleDuplicateAdd}
          onCancel={() => setDuplicateSourceInstanceId(null)}
        />
      )}
    </div>
  );
}
