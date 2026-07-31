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
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { AWS_REGION_OPTIONS, getRegionFieldName } from './field_config';
import type { TransportType } from './field_config';
import { useServiceSettings } from './use_service_settings';
import { ServiceSettingsFlyout } from './service_settings_flyout';
import { SignalTypeBadge } from '../services_step/signal_type_badge';
import { ServiceSearchFilter } from '../service_search_filter';
import type { SignalFilter } from '../services_step/use_services_step';

interface ServiceSettingsStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function ServiceSettingsStep({ onContinue, onBack }: ServiceSettingsStepProps) {
  const {
    globalRegion,
    setGlobalRegion,
    selectedServices,
    filteredServices,
    incompleteServices,
    incompleteServiceIds,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    getServiceVars,
    setServiceFieldsAndTransport,
    globalRegionTouched,
    setGlobalRegionTouched,
    isReady,
    handleNext,
  } = useServiceSettings({ onContinue });

  const [activeFlyoutServiceId, setActiveFlyoutServiceId] = useState<string | null>(null);

  const activeFlyoutService = activeFlyoutServiceId
    ? selectedServices.find((s) => s.id === activeFlyoutServiceId) ?? null
    : null;

  const handleFlyoutApply =
    (serviceId: string) => (fields: Record<string, string>, transport: TransportType | null) => {
      setServiceFieldsAndTransport(serviceId, fields, transport);
      setActiveFlyoutServiceId(null);
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
    if (incompleteServices.length > 0) {
      reasons.push(
        i18n.translate('xpack.ingestHub.serviceSettingsStep.continueTooltip.incompleteServices', {
          defaultMessage:
            '{count, plural, one {# service needs configuration} other {# services need configuration}}',
          values: { count: incompleteServices.length },
        })
      );
    }
    return reasons.join(' · ');
  }, [isReady, globalRegion, incompleteServices]);

  const columns: Array<EuiBasicTableColumn<AwsServiceMatrixEntry>> = useMemo(
    () => [
      {
        width: '32px',
        render: (service: AwsServiceMatrixEntry) =>
          incompleteServiceIds.has(service.id) ? (
            <EuiIconTip
              type="warning"
              color="warning"
              content={i18n.translate(
                'xpack.ingestHub.serviceSettingsStep.table.attentionTooltip',
                { defaultMessage: 'Required configuration missing' }
              )}
              data-test-subj={`serviceSettingsStep-attentionIcon-${service.id}`}
            />
          ) : null,
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.serviceName', {
          defaultMessage: 'Service Name',
        }),
        render: (service: AwsServiceMatrixEntry) => (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="expand"
                size="xs"
                color="text"
                onClick={() => setActiveFlyoutServiceId(service.id)}
                aria-label={i18n.translate(
                  'xpack.ingestHub.serviceSettingsStep.table.editAriaLabel',
                  { defaultMessage: 'Edit {name}', values: { name: service.name } }
                )}
                data-test-subj={`serviceSettingsStep-editButton-${service.id}`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => setActiveFlyoutServiceId(service.id)}
                data-test-subj={`serviceSettingsStep-serviceLink-${service.id}`}
              >
                {service.name}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        sortable: (service: AwsServiceMatrixEntry) => service.name,
      },
      {
        field: 'signalType' as const,
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.collects', {
          defaultMessage: 'Collects',
        }),
        render: (signalType: AwsServiceMatrixEntry['signalType']) => (
          <SignalTypeBadge signalType={signalType} />
        ),
        sortable: true,
      },
      {
        field: 'category' as const,
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.category', {
          defaultMessage: 'Category',
        }),
        sortable: true,
      },
      {
        name: i18n.translate('xpack.ingestHub.serviceSettingsStep.table.col.region', {
          defaultMessage: 'Region',
        }),
        render: (service: AwsServiceMatrixEntry) => {
          const config = getServiceVars(service.id);
          const regionField = getRegionFieldName(service, config.trigger);
          const override = config.vars[regionField]?.trim();
          if (override) return override;
          if (globalRegion) {
            return globalRegion;
          }
          return (
            <EuiText size="s" color="subdued">
              —
            </EuiText>
          );
        },
      },
    ],
    [getServiceVars, globalRegion, incompleteServiceIds]
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
                    defaultMessage: 'Can be overridden per service',
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

      {incompleteServices.length > 0 && (
        <>
          <EuiCallOut
            color="warning"
            iconType="warning"
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
          values={{ count: <strong>{filteredServices.length}</strong> }}
        />
      </EuiText>

      <EuiSpacer size="s" />

      <EuiInMemoryTable
        items={filteredServices}
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
            <EuiButtonEmpty iconType="arrowLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={continueTooltipContent}>
            <span>
              <EuiButton
                fill
                onClick={handleNext}
                disabled={!isReady}
                data-test-subj="serviceSettingsStep-continueButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.serviceSettingsStep.continueButton"
                  defaultMessage="Continue"
                />
              </EuiButton>
            </span>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {activeFlyoutService && (
        <ServiceSettingsFlyout
          service={activeFlyoutService}
          config={getServiceVars(activeFlyoutService.id)}
          globalRegion={globalRegion}
          onApply={handleFlyoutApply(activeFlyoutService.id)}
          onClose={() => setActiveFlyoutServiceId(null)}
        />
      )}
    </div>
  );
}
