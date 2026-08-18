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
  EuiComboBox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
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
import { getCategoryTitle } from '../../service_categories';
import {
  AWS_REGION_OPTIONS,
  getRegionFieldName,
  hasConfigurableFlyoutFields,
} from './field_config';
import type { TransportType } from './field_config';
import type { ServiceInstance } from './use_service_settings';
import { useServiceSettings } from './use_service_settings';
import { ServiceSettingsFlyout } from './service_settings_flyout';
import { DuplicateServiceModal } from './duplicate_service_modal';
import { SignalTypeBadge } from '../services_step/signal_type_badge';
import { ServiceSearchFilter } from '../service_search_filter';
import { buildDuplicateName } from './duplicate_name';
import type { SignalFilter } from '../services_step/use_services_step';

interface ServiceSettingsStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function ServiceSettingsStep({ onContinue, onBack }: ServiceSettingsStepProps) {
  const {
    globalRegion,
    setGlobalRegion,
    instances,
    filteredInstances,
    incompleteInstances,
    incompleteInstanceIds,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    getServiceVars,
    setServiceFieldsAndTransport,
    addDuplicate,
    removeInstance,
    allInstanceNames,
    globalRegionTouched,
    setGlobalRegionTouched,
    isReady,
    handleNext,
  } = useServiceSettings({ onContinue });

  const { awsServicesMap } = useOnboardingFlow();

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
    (instanceId: string) => (fields: Record<string, string>, transport: TransportType | null) => {
      setServiceFieldsAndTransport(instanceId, fields, transport);
      setActiveFlyoutInstanceId(null);
    };

  const handleDuplicateAdd = (
    name: string,
    fields: Record<string, string>,
    transport: TransportType | null
  ) => {
    if (!duplicateSourceInstanceId) return;
    addDuplicate(duplicateSourceInstanceId, name, fields, transport);
    setDuplicateSourceInstanceId(null);
  };

  const globalRegionOptions = AWS_REGION_OPTIONS;
  const selectedGlobalRegionOption = globalRegion ? [{ label: globalRegion }] : [];

  const continueTooltipContent = useMemo(() => {
    if (isReady) return undefined;
    const reasons: string[] = [];
    if (!globalRegion.trim()) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.noRegion', {
          defaultMessage: 'Set a global region',
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
  }, [isReady, globalRegion, incompleteInstances]);

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
          return service ? <SignalTypeBadge signalType={service.signalType} /> : null;
        },
        sortable: (inst: ServiceInstance) => awsServicesMap?.get(inst.serviceId)?.signalType ?? '',
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.category', {
          defaultMessage: 'Category',
        }),
        render: (inst: ServiceInstance) => {
          const cat = awsServicesMap?.get(inst.serviceId)?.category;
          return cat ? getCategoryTitle(cat) : '';
        },
        sortable: (inst: ServiceInstance) => {
          const cat = awsServicesMap?.get(inst.serviceId)?.category;
          return cat ? getCategoryTitle(cat) : '';
        },
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.region', {
          defaultMessage: 'Region',
        }),
        render: (inst: ServiceInstance) => {
          const service = awsServicesMap?.get(inst.serviceId);
          if (!service) return null;
          const config = getServiceVars(inst.instanceId);
          const regionField = getRegionFieldName(service, config.trigger);
          const override = config.vars[regionField]?.trim();
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
    <div data-test-subj="onboardingStep-serviceSettings">
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
        <EuiFlexItem grow={false} style={{ minWidth: 260 }}>
          <EuiFormRow
            display="rowCompressed"
            label={
              <>
                {i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.label', {
                  defaultMessage: 'Global AWS region',
                })}{' '}
                <EuiIconTip
                  type="info"
                  color="subdued"
                  content={i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.note', {
                    defaultMessage: 'Applies to all services',
                  })}
                />
              </>
            }
            isInvalid={globalRegionTouched && !globalRegion.trim()}
            error={
              globalRegionTouched && !globalRegion.trim() ? (
                <span data-test-subj="serviceSettingsStep-globalRegionError">
                  {i18n.translate('xpack.ingestHub.serviceSettingsStep.globalRegion.error', {
                    defaultMessage: 'A global region is required.',
                  })}
                </span>
              ) : undefined
            }
          >
            <EuiComboBox
              compressed
              singleSelection={{ asPlainText: true }}
              options={globalRegionOptions}
              selectedOptions={selectedGlobalRegionOption}
              onChange={(selected) => {
                setGlobalRegionTouched(true);
                setGlobalRegion(selected[0]?.label ?? '');
              }}
              onCreateOption={(searchValue) => {
                setGlobalRegionTouched(true);
                setGlobalRegion(searchValue);
              }}
              isInvalid={globalRegionTouched && !globalRegion.trim()}
              customOptionText='Use "{searchValue}" as region'
              placeholder={i18n.translate(
                'xpack.ingestHub.serviceSettingsStep.globalRegion.placeholder',
                { defaultMessage: 'Select or enter a region' }
              )}
              data-test-subj="serviceSettingsStep-globalRegion"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

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
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        sorting={true}
        tableLayout="auto"
        tableCaption={i18n.translate('xpack.ingestHub.serviceSettingsStep.table.caption', {
          defaultMessage: 'Selected AWS services configuration',
        })}
        data-test-subj="serviceSettingsStep-table"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={continueTooltipContent}>
            {/* span needed: disabled <button> swallows pointer events, span intercepts them for the tooltip */}
            <span tabIndex={0} style={{ display: 'inline-block' }}>
              <EuiButton
                fill
                onClick={handleNext}
                disabled={!isReady}
                data-test-subj="serviceSettingsStep-continueButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.serviceSettingsStep.nextButton"
                  defaultMessage="Next"
                />
              </EuiButton>
            </span>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {activeFlyoutService && activeFlyoutInstance && (
        <ServiceSettingsFlyout
          service={activeFlyoutService}
          config={getServiceVars(activeFlyoutInstance.instanceId)}
          onApply={handleFlyoutApply(activeFlyoutInstance.instanceId)}
          onClose={() => setActiveFlyoutInstanceId(null)}
        />
      )}

      {duplicateSourceService && duplicateSourceInstance && (
        <DuplicateServiceModal
          service={duplicateSourceService}
          sourceConfig={getServiceVars(duplicateSourceInstance.instanceId)}
          suggestedName={buildDuplicateName(duplicateSourceService.name, allInstanceNames)}
          existingNames={allInstanceNames}
          onAdd={handleDuplicateAdd}
          onCancel={() => setDuplicateSourceInstanceId(null)}
        />
      )}
    </div>
  );
}
