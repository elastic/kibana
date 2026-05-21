/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AWS service picker for the Streams catalog modal — behaviour and layout mirror
 * `AwsOnboardingSelectServicesStep` in observability_onboarding (Add data → AWS).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  type EuiSearchBarProps,
  type Query,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AwsService } from './aws_services_data';

type AwsServiceBrowseGroupId = 'all' | 'logs' | 'metrics';

const AWS_SERVICE_BROWSE_GROUP_ORDER: readonly AwsServiceBrowseGroupId[] = [
  'all',
  'logs',
  'metrics',
];

function awsBrowseGroupTitle(id: AwsServiceBrowseGroupId): string {
  switch (id) {
    case 'all':
      return i18n.translate('xpack.streams.dataSources.awsModal.browseGroup.all', {
        defaultMessage: 'All',
      });
    case 'logs':
      return i18n.translate('xpack.streams.dataSources.awsModal.browseGroup.logs', {
        defaultMessage: 'Logs',
      });
    case 'metrics':
      return i18n.translate('xpack.streams.dataSources.awsModal.browseGroup.metrics', {
        defaultMessage: 'Metrics',
      });
    default:
      return id;
  }
}

function parseAwsServiceSearchText(query: Query | null | undefined): string {
  if (!query?.ast) {
    return '';
  }

  const termClauses = query.ast.getTermClauses?.() ?? [];
  if (termClauses.length === 0) {
    return '';
  }

  return termClauses
    .map((clause) => (clause?.value != null ? String(clause.value) : ''))
    .join(' ')
    .trim();
}

function awsServiceDataTypeBadgeLabel(
  serviceId: string,
  logsServiceIdSet: ReadonlySet<string>
): string {
  return logsServiceIdSet.has(serviceId)
    ? awsBrowseGroupTitle('logs')
    : awsBrowseGroupTitle('metrics');
}

function servicesForBrowseGroup(
  groupId: AwsServiceBrowseGroupId,
  catalog: readonly AwsService[],
  logsServiceIdSet: ReadonlySet<string>
): AwsService[] {
  if (groupId === 'all') {
    return [...catalog].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (groupId === 'logs') {
    return [...catalog]
      .filter((s) => logsServiceIdSet.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...catalog]
    .filter((s) => !logsServiceIdSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const LogoBadge: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 32,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
      />
    </div>
  );
};

const AwsServicePickerScrollArea: React.FC<{
  children: React.ReactNode;
  maxHeightPx?: number;
  fillAvailableHeight?: boolean;
}> = ({ children, maxHeightPx = 540, fillAvailableHeight = false }) => {
  const scrollBarCss = useEuiScrollBar();

  return (
    <div
      css={css`
        ${fillAvailableHeight
          ? css`
              flex: 1 1 0%;
              min-height: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            `
          : ''}
      `}
    >
      <div
        tabIndex={0}
        data-test-subj="streamsAwsModalServiceGridScroll"
        css={css`
          ${scrollBarCss}
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          ${fillAvailableHeight
            ? css`
                flex: 1;
                max-height: none;
              `
            : css`
                max-height: ${maxHeightPx}px;
              `}
          &:focus {
            outline: none;
          }
        `}
      >
        {children}
      </div>
    </div>
  );
};

export interface AwsModalSelectServicesStepProps {
  readonly catalog: readonly AwsService[];
  readonly logsServiceIdSet: ReadonlySet<string>;
  readonly manualServiceIds: ReadonlySet<string>;
  readonly onSetManualServiceIds: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
  /** Max height of the scrollable service grid when not using flex fill. */
  readonly maxGridScrollHeightPx?: number;
  /** Grow the service grid to fill remaining modal height (matches full-page wizard). */
  readonly fillAvailableHeight?: boolean;
}

export const AwsModalSelectServicesStep: React.FC<AwsModalSelectServicesStepProps> = ({
  catalog,
  logsServiceIdSet,
  manualServiceIds,
  onSetManualServiceIds,
  maxGridScrollHeightPx = 540,
  fillAvailableHeight = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [awsServiceBrowseGroup, setAwsServiceBrowseGroup] =
    useState<AwsServiceBrowseGroupId>('all');
  const [awsServiceBrowseQuery, setAwsServiceBrowseQuery] = useState<Query>(
    EuiSearchBar.Query.MATCH_ALL
  );

  const awsBrowseServiceSearch = useMemo(
    () => parseAwsServiceSearchText(awsServiceBrowseQuery),
    [awsServiceBrowseQuery]
  );

  const servicesInActiveBrowseGroup = useMemo(
    () => servicesForBrowseGroup(awsServiceBrowseGroup, catalog, logsServiceIdSet),
    [awsServiceBrowseGroup, catalog, logsServiceIdSet]
  );

  const browseGroupFilteredServices = useMemo(() => {
    const q = awsBrowseServiceSearch.trim().toLowerCase();
    if (!q) {
      return servicesInActiveBrowseGroup;
    }
    return servicesInActiveBrowseGroup.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
    );
  }, [servicesInActiveBrowseGroup, awsBrowseServiceSearch]);

  const allBrowseGroupFilteredSelected = useMemo(
    () =>
      browseGroupFilteredServices.length > 0 &&
      browseGroupFilteredServices.every((s) => manualServiceIds.has(s.id)),
    [browseGroupFilteredServices, manualServiceIds]
  );

  const onServiceCheckedChange = useCallback(
    (serviceId: string, isChecked: boolean) => {
      onSetManualServiceIds((prev) => {
        if (prev.has(serviceId) === isChecked) {
          return prev;
        }
        const next = new Set(prev);
        if (isChecked) {
          next.add(serviceId);
        } else {
          next.delete(serviceId);
        }
        return next;
      });
    },
    [onSetManualServiceIds]
  );

  const onAwsServiceBrowseQueryChange = useCallback<EuiSearchBarProps['onChange']>(
    ({ query, error }) => {
      if (error || !query) {
        return;
      }
      setAwsServiceBrowseQuery(query);
    },
    []
  );

  const onSelectAllVisibleServices = useCallback(() => {
    onSetManualServiceIds((prev) => {
      const visibleServiceIds = browseGroupFilteredServices.map((service) => service.id);
      if (visibleServiceIds.length === 0) {
        return prev;
      }

      const allVisibleSelected = visibleServiceIds.every((id) => prev.has(id));
      const next = new Set(prev);

      if (allVisibleSelected) {
        for (const id of visibleServiceIds) {
          next.delete(id);
        }
      } else {
        for (const id of visibleServiceIds) {
          next.add(id);
        }
      }

      if (
        next.size === prev.size &&
        visibleServiceIds.every((id) => prev.has(id) === next.has(id))
      ) {
        return prev;
      }

      return next;
    });
  }, [browseGroupFilteredServices, onSetManualServiceIds]);

  const awsServiceBrowseToolbarShellCss = useMemo(
    () => css`
      .euiFlexGroup:has(.euiSearchBar__searchHolder) {
        align-items: center;
        flex-wrap: nowrap;
      }

      .euiSearchBar__searchHolder {
        min-width: 0;
        flex-grow: 1;
      }
    `,
    []
  );

  const awsServicePickerGridCss = useMemo(
    () => css`
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: ${euiTheme.size.s};
      @media (max-width: ${euiTheme.breakpoint.m}px) {
        grid-template-columns: 1fr;
      }
    `,
    [euiTheme.breakpoint.m, euiTheme.size.s]
  );

  const awsServiceCheckableCardCss = useMemo(
    () =>
      css`
        overflow: visible;

        & [class*='euiSplitPanel'] {
          overflow: visible;
        }

        p {
          margin: 0;
        }
        & [class*='euiSplitPanel__inner']:not(:has([class*='euiCheckableCard__label'])) {
          display: flex;
          align-items: center;
          justify-content: center;
          border-inline-end: none !important;
        }
        & [class*='euiCheckableCard__label'] {
          padding: ${euiTheme.size.m};
          min-width: 0;
        }
      `,
    [euiTheme.size.m]
  );

  const rootCss = useMemo(
    () =>
      fillAvailableHeight
        ? css`
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `
        : undefined,
    [fillAvailableHeight]
  );

  const servicesSelectionHeaderCss = useMemo(
    () => css`
      flex-grow: 0;
      flex-shrink: 0;
    `,
    []
  );

  const servicesPanelCss = useMemo(
    () =>
      fillAvailableHeight
        ? css`
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `
        : undefined,
    [fillAvailableHeight]
  );

  return (
    <div css={rootCss}>
      <div
        css={[
          awsServiceBrowseToolbarShellCss,
          fillAvailableHeight &&
            css`
              flex-shrink: 0;
            `,
        ]}
        data-test-subj="streamsAwsModalServiceBrowseToolbar"
      >
        <EuiSearchBar
          box={{
            compressed: true,
            incremental: true,
            placeholder: i18n.translate('xpack.streams.dataSources.awsModal.searchPlaceholder', {
              defaultMessage: 'Search AWS services…',
            }),
            'data-test-subj': 'streamsAwsModalFieldSearch',
          }}
          query={awsServiceBrowseQuery}
          onChange={onAwsServiceBrowseQueryChange}
          toolsRight={
            <EuiButtonGroup
              data-test-subj="streamsAwsModalServiceBrowseGroup"
              legend={i18n.translate('xpack.streams.dataSources.awsModal.browseGroupLegend', {
                defaultMessage: 'Browse AWS integrations by category',
              })}
              buttonSize="compressed"
              idSelected={awsServiceBrowseGroup}
              onChange={(id) => setAwsServiceBrowseGroup(id as AwsServiceBrowseGroupId)}
              options={AWS_SERVICE_BROWSE_GROUP_ORDER.map((groupId) => ({
                id: groupId,
                label: awsBrowseGroupTitle(groupId),
              }))}
            />
          }
        />
      </div>
      <EuiSpacer size={fillAvailableHeight ? 's' : 'm'} />
      <div css={servicesPanelCss} data-test-subj="streamsAwsModalIndividualServicesPanel">
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={servicesSelectionHeaderCss}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.dataSources.awsModal.listHeader', {
                defaultMessage:
                  '{count, plural, one {# service selected} other {# services selected}}',
                values: { count: manualServiceIds.size },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="streamsAwsModalSelectAllVisibleButton"
              size="xs"
              disabled={browseGroupFilteredServices.length === 0}
              onClick={onSelectAllVisibleServices}
            >
              {allBrowseGroupFilteredSelected
                ? i18n.translate('xpack.streams.dataSources.awsModal.deselectAll', {
                    defaultMessage: 'Deselect all',
                  })
                : i18n.translate('xpack.streams.dataSources.awsModal.selectAll', {
                    defaultMessage: 'Select all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <AwsServicePickerScrollArea
          maxHeightPx={maxGridScrollHeightPx}
          fillAvailableHeight={fillAvailableHeight}
        >
          <div css={awsServicePickerGridCss}>
            {browseGroupFilteredServices.map((svc) => {
              const checked = manualServiceIds.has(svc.id);
              return (
                <EuiCheckableCard
                  key={svc.id}
                  id={`streams-aws-modal-${svc.id}`}
                  checkableType="checkbox"
                  checked={checked}
                  onChange={(event) => onServiceCheckedChange(svc.id, event.target.checked)}
                  css={awsServiceCheckableCardCss}
                  label={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <LogoBadge src={svc.logoUrl} alt="" size={26} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                        <strong>{svc.name}</strong>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color="hollow"
                          data-test-subj={`streamsAwsModalServiceDataTypeBadge-${svc.id}`}
                        >
                          {awsServiceDataTypeBadgeLabel(svc.id, logsServiceIdSet)}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              );
            })}
          </div>
        </AwsServicePickerScrollArea>
      </div>
    </div>
  );
};
