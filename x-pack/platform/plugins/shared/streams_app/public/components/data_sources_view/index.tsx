/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiSplitButton,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { CompactLogoIcon, DataSourcesCatalogFlyout } from './data_sources_catalog_flyout';
import { AssetImage } from '../asset_image';

const ELASTIC_LOGOS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages';

type DataSourceStatus = 'active' | 'delayed' | 'stale';
type DataSourceCategory = 'integration' | 'input_package' | 'asset' | 'connector' | 'api' | 'custom';

interface DataSource {
  id: string;
  name: string;
  category: DataSourceCategory;
  docsPerSec: number;
  streamName: string;
  logoUrl: string;
  status: DataSourceStatus;
  lastSeen: string;
  detail: string;
  dashboards?: number;
  rules?: number;
  hasUpdate?: boolean;
  hasRollback?: boolean;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'cloudwatch',
    name: 'AWS CloudWatch Logs',
    category: 'integration',
    docsPerSec: 87,
    streamName: 'logs-aws.cloudwatch_logs-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudwatch.svg`,
    status: 'active',
    lastSeen: 'Just now',
    detail: '14 log groups',
    dashboards: 5,
    rules: 12,
  },
  {
    id: 'vpcflow',
    name: 'Amazon VPC Flow Logs',
    category: 'integration',
    docsPerSec: 56,
    streamName: 'logs-aws.vpcflow-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg`,
    status: 'active',
    lastSeen: 'Just now',
    detail: '2 VPCs',
    dashboards: 3,
    rules: 7,
  },
  {
    id: 's3',
    name: 'Amazon S3 Access Logs',
    category: 'input_package',
    docsPerSec: 34,
    streamName: 'logs-aws.s3access-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg`,
    status: 'delayed',
    lastSeen: '23 min ago',
    detail: '3 buckets',
    hasUpdate: true,
  },
  {
    id: 'cloudtrail',
    name: 'AWS CloudTrail',
    category: 'integration',
    docsPerSec: 21,
    streamName: 'logs-aws.cloudtrail-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudtrail.svg`,
    status: 'active',
    lastSeen: 'Just now',
    detail: 'Trail logs enabled',
    dashboards: 2,
    rules: 4,
  },
  {
    id: 'elb',
    name: 'AWS ELB Access Logs',
    category: 'asset',
    docsPerSec: 15,
    streamName: 'logs-aws.elb_logs-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_elb.svg`,
    status: 'active',
    lastSeen: 'Just now',
    detail: '4 load balancers',
    dashboards: 1,
    rules: 3,
    hasRollback: true,
  },
  {
    id: 'guardduty',
    name: 'Amazon GuardDuty',
    category: 'integration',
    docsPerSec: 8,
    streamName: 'logs-aws.guardduty-default',
    logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_guardduty.svg`,
    status: 'stale',
    lastSeen: '2 h ago',
    detail: 'Findings enabled',
    dashboards: 4,
    rules: 9,
    hasUpdate: true,
  },
];

const CATEGORY_CONFIG: Record<DataSourceCategory, { label: string }> = {
  integration: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.integration', {
      defaultMessage: 'Integration',
    }),
  },
  input_package: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.inputPackage', {
      defaultMessage: 'Input package',
    }),
  },
  asset: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.asset', {
      defaultMessage: 'Asset',
    }),
  },
  connector: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.connector', {
      defaultMessage: 'Connector',
    }),
  },
  api: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.api', {
      defaultMessage: 'API ingestion',
    }),
  },
  custom: {
    label: i18n.translate('xpack.streams.dataSourcesView.category.custom', {
      defaultMessage: 'Custom',
    }),
  },
};

const CATEGORY_CARDS: Array<{ category: DataSourceCategory; label: string; icon: string }> = [
  {
    category: 'integration',
    label: i18n.translate('xpack.streams.dataSourcesView.categoryCard.integrations', {
      defaultMessage: 'Integrations',
    }),
    icon: 'grid',
  },
  {
    category: 'input_package',
    label: i18n.translate('xpack.streams.dataSourcesView.categoryCard.inputPackages', {
      defaultMessage: 'Input packages',
    }),
    icon: 'package',
  },
  {
    category: 'asset',
    label: i18n.translate('xpack.streams.dataSourcesView.categoryCard.assets', {
      defaultMessage: 'Assets',
    }),
    icon: 'layers',
  },
  {
    category: 'connector',
    label: i18n.translate('xpack.streams.dataSourcesView.categoryCard.connectors', {
      defaultMessage: 'Connectors',
    }),
    icon: 'plugs',
  },
];

export function DataSourcesView() {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const {
    core: { application },
  } = useKibana();
  const [hasIngestedMockAwsData, setHasIngestedMockAwsData] = useState(
    () => sessionStorage.getItem('ingestHub:dataAdded') === 'true'
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<DataSourceCategory>>(new Set());
  const [customOnly, setCustomOnly] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const handleDataConnected = useCallback(() => {
    sessionStorage.setItem('ingestHub:dataAdded', 'true');
    setHasIngestedMockAwsData(true);
  }, []);

  const openCatalog = useCallback(() => setIsCatalogOpen(true), []);
  const closeCatalog = useCallback(() => setIsCatalogOpen(false), []);

  const toggleCategory = useCallback((cat: DataSourceCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const showCustomFilter =
    activeCategories.size === 0 || activeCategories.has('integration');

  const filteredSources = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return DATA_SOURCES.filter((source) => {
      const matchesSearch =
        !q ||
        source.name.toLowerCase().includes(q) ||
        source.streamName.toLowerCase().includes(q);
      const matchesCategory =
        activeCategories.size === 0 || activeCategories.has(source.category);
      const matchesCustom = !customOnly || source.category === 'custom';
      return matchesSearch && matchesCategory && matchesCustom;
    }).sort((a, b) => (b.hasUpdate ? 1 : 0) - (a.hasUpdate ? 1 : 0));
  }, [searchQuery, activeCategories, customOnly]);

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.dataSourcesView.pageTitle', {
                  defaultMessage: 'Data sources',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={i18n.translate('xpack.streams.dataSourcesView.pageDescription', {
          defaultMessage:
            'Browse and manage all data sources sending data to your streams.',
        })}
        rightSideItems={
          hasIngestedMockAwsData
            ? [
                <EuiButton key="add-data" iconType="plusInCircle" fill size="s" onClick={openCatalog}>
                  {i18n.translate('xpack.streams.dataSourcesView.addDataButton', {
                    defaultMessage: 'Add data',
                  })}
                </EuiButton>,
              ]
            : []
        }
      />
      <StreamsAppPageTemplate.Body grow={!hasIngestedMockAwsData}>
        {!hasIngestedMockAwsData ? (
          <EuiEmptyPrompt
            css={{
              maxInlineSize: '100% !important',
              '.euiEmptyPrompt__content': { flexBasis: '35%' },
              '.euiEmptyPrompt__icon': { maxInlineSize: 'unset !important' },
              '.euiEmptyPrompt__icon .euiImageWrapper': { maxInlineSize: 'unset !important' },
            }}
            icon={<AssetImage type="addStreams" size="fullWidth" />}
            layout="horizontal"
            color="plain"
            title={
              <h2>
                {i18n.translate('xpack.streams.dataSourcesView.emptyTitle', {
                  defaultMessage: 'Your live data registry',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.streams.dataSourcesView.emptyBody', {
                  defaultMessage:
                    'Connect integrations, packages, connectors, or APIs and get an instant view of what\'s flowing — volume, schema, and health for every source in one place. Once connected, manage retention, routing, and policies without leaving Streams.',
                })}
              </p>
            }
            actions={
              <EuiButton color="primary" fill onClick={openCatalog}>
                {i18n.translate('xpack.streams.dataSourcesView.emptyAddDataButton', {
                  defaultMessage: 'Add data',
                })}
              </EuiButton>
            }
          />
        ) : (
          <>
            <EuiSplitPanel.Outer
              direction="row"
              hasShadow={false}
              hasBorder={false}
              color="plain"
              css={css`
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
                padding: ${euiTheme.size.s};
                gap: ${euiTheme.size.s};
              `}
            >
              {(() => {
                const allSelected = activeCategories.size === 0;
                const totalCount = DATA_SOURCES.length;
                const totalUpdates = DATA_SOURCES.filter((s) => s.hasUpdate).length;
                const allCardCss = css`
                  height: 100%;
                  width: 100%;
                  border-radius: ${euiTheme.border.radius.medium};
                  border: ${euiTheme.border.width.thin} solid
                    ${allSelected ? euiTheme.colors.borderStrongPrimary : 'transparent'};
                  background-color: ${allSelected
                    ? euiTheme.colors.backgroundBaseSubdued
                    : 'inherit'};
                `;
                return (
                  <EuiSplitPanel.Inner paddingSize="none" grow>
                    <EuiButtonEmpty
                      onClick={() => {
                        setActiveCategories(new Set());
                        setCustomOnly(false);
                      }}
                      css={allCardCss}
                      contentProps={{
                        css: css`
                          justify-content: flex-start;
                          width: 100%;
                          padding: ${euiTheme.size.m};
                          flex-direction: column;
                          align-items: flex-start;
                        `,
                      }}
                      color={allSelected ? 'primary' : 'text'}
                      aria-label={i18n.translate(
                        'xpack.streams.dataSourcesView.allCard.label',
                        { defaultMessage: 'All' }
                      )}
                    >
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="apps" size="m" color="primary" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="primary">
                            {i18n.translate('xpack.streams.dataSourcesView.allCard.label', {
                              defaultMessage: 'All',
                            })}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiText textAlign="left">
                            <h2>{totalCount}</h2>
                          </EuiText>
                        </EuiFlexItem>
                        {totalUpdates > 0 && (
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="warning">
                              {i18n.translate(
                                'xpack.streams.dataSourcesView.allCard.updates',
                                {
                                  defaultMessage:
                                    '{totalUpdates} {totalUpdates, plural, one {update} other {updates}}',
                                  values: { totalUpdates },
                                }
                              )}
                            </EuiBadge>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiButtonEmpty>
                  </EuiSplitPanel.Inner>
                );
              })()}
              {CATEGORY_CARDS.map(({ category, label, icon }, index) => {
                const count = DATA_SOURCES.filter((s) => s.category === category).length;
                const updates = DATA_SOURCES.filter(
                  (s) => s.category === category && s.hasUpdate
                ).length;
                const isSelected = activeCategories.has(category);
                const allSelected = activeCategories.size === 0;
                const prevIsSelected =
                  index === 0
                    ? allSelected
                    : activeCategories.has(CATEGORY_CARDS[index - 1].category);
                const showDivider = !prevIsSelected && !isSelected;
                const cardCss = css`
                  height: 100%;
                  width: 100%;
                  border-radius: ${euiTheme.border.radius.medium};
                  border: ${euiTheme.border.width.thin} solid
                    ${isSelected ? euiTheme.colors.borderStrongPrimary : 'transparent'};
                  background-color: ${isSelected
                    ? euiTheme.colors.backgroundBaseSubdued
                    : 'inherit'};
                `;
                return (
                  <React.Fragment key={category}>
                    <EuiHorizontalRule
                      margin="none"
                      css={css`
                        width: ${euiTheme.border.width.thin};
                        height: auto;
                        align-self: stretch;
                        margin-top: ${euiTheme.size.m};
                        margin-bottom: ${euiTheme.size.m};
                        visibility: ${showDivider ? 'visible' : 'hidden'};
                      `}
                    />
                    <EuiSplitPanel.Inner paddingSize="none" grow>
                      <EuiButtonEmpty
                        onClick={() => {
                          setActiveCategories(new Set([category]));
                          if (category !== 'integration') setCustomOnly(false);
                        }}
                        css={cardCss}
                        contentProps={{
                          css: css`
                            justify-content: flex-start;
                            width: 100%;
                            padding: ${euiTheme.size.m};
                            flex-direction: column;
                            align-items: flex-start;
                          `,
                        }}
                        color={isSelected ? 'primary' : 'text'}
                        aria-label={label}
                      >
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type={icon} size="m" color="primary" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" color="primary">
                              {label}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiSpacer size="m" />
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiText textAlign="left">
                              <h2>{count}</h2>
                            </EuiText>
                          </EuiFlexItem>
                          {updates > 0 && (
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="warning">
                                {i18n.translate(
                                  'xpack.streams.dataSourcesView.categoryCard.updates',
                                  {
                                    defaultMessage:
                                      '{updates} {updates, plural, one {update} other {updates}}',
                                    values: { updates },
                                  }
                                )}
                              </EuiBadge>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      </EuiButtonEmpty>
                    </EuiSplitPanel.Inner>
                  </React.Fragment>
                );
              })}
            </EuiSplitPanel.Outer>
            <EuiSpacer size="l" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiFieldSearch
                  placeholder={i18n.translate(
                    'xpack.streams.dataSourcesView.searchPlaceholder',
                    { defaultMessage: 'Search data sources…' }
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  isClearable
                  fullWidth
                />
              </EuiFlexItem>
              {showCustomFilter && (
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup>
                    <EuiFilterButton
                      hasActiveFilters={customOnly}
                      onClick={() => setCustomOnly((prev) => !prev)}
                    >
                      {i18n.translate('xpack.streams.dataSourcesView.customFilter', {
                        defaultMessage: 'Custom',
                      })}
                    </EuiFilterButton>
                  </EuiFilterGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiBasicTable<DataSource>
              data-test-subj="dataSourcesTable"
              items={filteredSources}
              rowHeader="name"
              columns={[
                {
                  field: 'name',
                  name: i18n.translate('xpack.streams.dataSourcesView.sourceColumn', {
                    defaultMessage: 'Source',
                  }),
                  render: (name: string, item: DataSource) => (
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <CompactLogoIcon src={item.logoUrl} alt={name} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                },
                {
                  field: 'dashboards',
                  name: i18n.translate('xpack.streams.dataSourcesView.dashboardsColumn', {
                    defaultMessage: 'Dashboards',
                  }),
                  width: '120px',
                  render: (dashboards: number | undefined, item: DataSource) => {
                    if (item.category !== 'integration' && item.category !== 'asset') {
                      return (
                        <EuiText size="s" color="subdued">
                          —
                        </EuiText>
                      );
                    }
                    return <EuiLink onClick={() => {}}>{dashboards ?? 0}</EuiLink>;
                  },
                },
                {
                  field: 'rules',
                  name: i18n.translate('xpack.streams.dataSourcesView.rulesColumn', {
                    defaultMessage: 'Rules',
                  }),
                  width: '100px',
                  render: (rules: number | undefined, item: DataSource) => {
                    if (item.category !== 'integration' && item.category !== 'asset') {
                      return (
                        <EuiText size="s" color="subdued">
                          —
                        </EuiText>
                      );
                    }
                    return <EuiLink onClick={() => {}}>{rules ?? 0}</EuiLink>;
                  },
                },
                {
                  field: 'category',
                  name: i18n.translate('xpack.streams.dataSourcesView.typeColumn', {
                    defaultMessage: 'Type',
                  }),
                  width: '140px',
                  render: (category: DataSourceCategory) => (
                    <EuiBadge color="hollow">{CATEGORY_CONFIG[category].label}</EuiBadge>
                  ),
                },
                {
                  field: 'streamName',
                  name: i18n.translate('xpack.streams.dataSourcesView.streamColumn', {
                    defaultMessage: 'Stream',
                  }),
                  width: '260px',
                  truncateText: true,
                  render: (streamName: string) => (
                    <EuiToolTip content={streamName} position="top">
                      <EuiLink
                        data-test-subj={`dataSourceStreamLink-${streamName}`}
                        href={router.link('/')}
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          router.push('/');
                        }}
                      >
                        {streamName}
                      </EuiLink>
                    </EuiToolTip>
                  ),
                },
                {
                  field: 'category',
                  name: i18n.translate('xpack.streams.dataSourcesView.policiesColumn', {
                    defaultMessage: 'Policies',
                  }),
                  width: '140px',
                  render: (_: DataSourceCategory, item: DataSource) => {
                    if (item.category !== 'integration' && item.category !== 'connector') {
                      return (
                        <EuiText size="s" color="subdued">
                          —
                        </EuiText>
                      );
                    }
                    return (
                      <EuiLink onClick={() => {}}>
                        {i18n.translate('xpack.streams.dataSourcesView.viewPoliciesLink', {
                          defaultMessage: 'View policies',
                        })}
                      </EuiLink>
                    );
                  },
                },
                {
                  name: i18n.translate('xpack.streams.dataSourcesView.actionsColumn', {
                    defaultMessage: 'Actions',
                  }),
                  width: '180px',
                  align: 'right' as const,
                  render: (item: DataSource) => {
                    const isOpen = openPopoverId === item.id;
                    const closePopover = () => setOpenPopoverId(null);
                    const isAsset = item.category === 'asset';

                    const uninstallItem = (
                      <EuiContextMenuItem
                        key="uninstall"
                        icon="trash"
                        onClick={closePopover}
                        css={{ color: `${euiTheme.colors.danger} !important` }}
                      >
                        {i18n.translate('xpack.streams.dataSourcesView.action.uninstall', {
                          defaultMessage: 'Uninstall',
                        })}
                      </EuiContextMenuItem>
                    );

                    const assetItems = [
                      ...(item.hasRollback
                        ? [
                            <EuiContextMenuItem
                              key="rollback"
                              icon="returnKey"
                              onClick={closePopover}
                            >
                              {i18n.translate(
                                'xpack.streams.dataSourcesView.action.rollback',
                                { defaultMessage: 'Rollback' }
                              )}
                            </EuiContextMenuItem>,
                          ]
                        : []),
                      <EuiContextMenuItem key="reinstall" icon="refresh" onClick={closePopover}>
                        {i18n.translate('xpack.streams.dataSourcesView.action.reinstall', {
                          defaultMessage: 'Reinstall',
                        })}
                      </EuiContextMenuItem>,
                      uninstallItem,
                    ];

                    const defaultItems = [
                      <EuiContextMenuItem key="edit" icon="pencil" onClick={closePopover}>
                        {i18n.translate(
                          'xpack.streams.dataSourcesView.action.editConfiguration',
                          { defaultMessage: 'Edit configuration' }
                        )}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem key="policies" icon="symlink" onClick={closePopover}>
                        {i18n.translate(
                          'xpack.streams.dataSourcesView.action.viewPolicies',
                          { defaultMessage: 'View attached policies' }
                        )}
                      </EuiContextMenuItem>,
                      uninstallItem,
                    ];

                    const contextItems = isAsset ? assetItems : defaultItems;

                    if (item.hasUpdate) {
                      const splitPopoverItems = isAsset
                        ? assetItems
                        : [
                            <EuiContextMenuItem key="edit" icon="pencil" onClick={closePopover}>
                              {i18n.translate(
                                'xpack.streams.dataSourcesView.action.editConfiguration',
                                { defaultMessage: 'Edit configuration' }
                              )}
                            </EuiContextMenuItem>,
                            <EuiContextMenuItem
                              key="policies"
                              icon="symlink"
                              onClick={closePopover}
                            >
                              {i18n.translate(
                                'xpack.streams.dataSourcesView.action.viewPolicies',
                                { defaultMessage: 'View attached policies' }
                              )}
                            </EuiContextMenuItem>,
                            uninstallItem,
                          ];

                      return (
                        <EuiPopover
                          isOpen={isOpen}
                          closePopover={closePopover}
                          panelPaddingSize="none"
                          anchorPosition="downRight"
                          button={
                            <EuiSplitButton size="s" color="primary">
                              <EuiSplitButton.ActionPrimary onClick={closePopover}>
                                {i18n.translate('xpack.streams.dataSourcesView.action.update', {
                                  defaultMessage: 'Update',
                                })}
                              </EuiSplitButton.ActionPrimary>
                              <EuiSplitButton.ActionSecondary
                                iconType="boxesVertical"
                                aria-label={i18n.translate(
                                  'xpack.streams.dataSourcesView.action.moreActions',
                                  { defaultMessage: 'More actions' }
                                )}
                                onClick={() => setOpenPopoverId(isOpen ? null : item.id)}
                              />
                            </EuiSplitButton>
                          }
                        >
                          <EuiContextMenuPanel items={splitPopoverItems} />
                        </EuiPopover>
                      );
                    }

                    return (
                      <EuiPopover
                        isOpen={isOpen}
                        closePopover={closePopover}
                        panelPaddingSize="none"
                        button={
                          <EuiButtonIcon
                            size="s"
                            display="base"
                            color="text"
                            iconType="boxesVertical"
                            aria-label={i18n.translate(
                              'xpack.streams.dataSourcesView.action.moreActions',
                              { defaultMessage: 'More actions' }
                            )}
                            onClick={() => setOpenPopoverId(isOpen ? null : item.id)}
                          />
                        }
                      >
                        <EuiContextMenuPanel items={contextItems} />
                      </EuiPopover>
                    );
                  },
                },
              ]}
              tableCaption={i18n.translate('xpack.streams.dataSourcesView.tableCaption', {
                defaultMessage: 'Data sources table',
              })}
            />
          </>
        )}
      </StreamsAppPageTemplate.Body>

      {isCatalogOpen && (
        <DataSourcesCatalogFlyout onClose={closeCatalog} onDataConnected={handleDataConnected} />
      )}
    </>
  );
}
