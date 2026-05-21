/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fleet-style AWS integration overview for the data-sources catalog modal
 * (loads readme, screenshots, and metadata from the Fleet EPM API).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEventHandler } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiSideNav,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import {
  AwsCatalogIntegrationReadme,
  getReadmeAnchorId,
} from './aws_catalog_integration_readme';
import type { AwsEpmPackageInfo } from './aws_epm_api';
import { toEpmPackageImageUrl } from './aws_epm_api';
import {
  AwsCatalogIntegrationBrandingRow,
  awsCatalogIntegrationHeaderShellCss,
  awsCatalogModalContentPadding,
} from './aws_catalog_integration_header';
import { useAwsEpmPackageOverview } from './use_aws_epm_package_overview';

type OverviewTab = 'overview' | 'settings' | 'configs' | 'apiReference';

interface SideNavItem {
  id: string;
  name: string;
  items?: SideNavItem[];
  forceOpen?: boolean;
  isSelected?: boolean;
  onClick: MouseEventHandler<HTMLElement | HTMLButtonElement>;
}

interface HeadingWithPosition {
  readonly line: string;
  readonly position: number;
}

const getHeadingName = (heading: string): string => heading.replace(/^#+\s*/, '');

const extractHeadingsWithIndices = (markDown: string | undefined): HeadingWithPosition[] => {
  if (!markDown) {
    return [];
  }
  const regex = /^\s*#+\s+(.+)/;
  return markDown
    .split('\n')
    .map((line, position) => ({ line, position }))
    .filter((obj) => obj.line.match(regex));
};

const KIBANA_ASSET_LABELS: Record<string, string> = {
  dashboard: 'Dashboards',
  'alerting_rule_template': 'Alerting rule templates',
  search: 'Discover sessions',
  index_pattern: 'Index patterns',
  map: 'Maps',
  ml_module: 'ML modules',
  tag: 'Tags',
  visualization: 'Visualizations',
};

const ELASTICSEARCH_ASSET_LABELS: Record<string, string> = {
  ingest_pipeline: 'Ingest pipelines',
  transform: 'Transforms',
  index_template: 'Index templates',
  ilm_policy: 'ILM policies',
  component_template: 'Component templates',
  ml_module: 'ML modules',
  knowledge_base: 'Knowledge base',
};

const buildDetailsListItems = (packageInfo: AwsEpmPackageInfo) => {
  const items: Array<{ title: string; description: React.ReactNode }> = [
    {
      title: i18n.translate('xpack.streams.dataSources.awsDetail.details.version', {
        defaultMessage: 'Version',
      }),
      description: packageInfo.version,
    },
  ];

  if (packageInfo.categories?.length) {
    items.push({
      title: i18n.translate('xpack.streams.dataSources.awsDetail.details.category', {
        defaultMessage: 'Category',
      }),
      description: packageInfo.categories.join(', '),
    });
  }

  const pushServiceAssets = (
    service: 'kibana' | 'elasticsearch',
    labels: Record<string, string>
  ) => {
    const typeToParts = packageInfo.assets?.[service];
    if (!typeToParts) {
      return;
    }

    const rows = Object.entries(typeToParts)
      .map(([assetType, parts]) => {
        const label = labels[assetType];
        if (!label || !parts?.length) {
          return undefined;
        }
        const count =
          assetType === 'transform'
            ? new Set(parts.map((part) => part.file).filter(Boolean)).size
            : parts.length;
        return { label, count };
      })
      .filter((row): row is { label: string; count: number } => row !== undefined);

    if (rows.length === 0) {
      return;
    }

    items.push({
      title:
        service === 'kibana'
          ? i18n.translate('xpack.streams.dataSources.awsDetail.details.kibanaAssets', {
              defaultMessage: 'Kibana assets',
            })
          : i18n.translate('xpack.streams.dataSources.awsDetail.details.esAssets', {
              defaultMessage: 'Elasticsearch assets',
            }),
      description: (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {rows.map(({ label, count }) => (
            <li key={label}>
              {label} ({count})
            </li>
          ))}
        </ul>
      ),
    });
  };

  pushServiceAssets('kibana', KIBANA_ASSET_LABELS);
  pushServiceAssets('elasticsearch', ELASTICSEARCH_ASSET_LABELS);

  const dataStreamTypes = [
    ...new Set(packageInfo.data_streams?.map((stream) => stream.type).filter(Boolean) ?? []),
  ];
  if (dataStreamTypes.length) {
    items.push({
      title: i18n.translate('xpack.streams.dataSources.awsDetail.details.features', {
        defaultMessage: 'Features',
      }),
      description: dataStreamTypes.join(', '),
    });
  }

  const subscription = packageInfo.conditions?.elastic?.subscription;
  if (subscription) {
    items.push({
      title: i18n.translate('xpack.streams.dataSources.awsDetail.details.subscription', {
        defaultMessage: 'Subscription',
      }),
      description: subscription,
    });
  }

  items.push({
    title: i18n.translate('xpack.streams.dataSources.awsDetail.details.developedBy', {
      defaultMessage: 'Developed by',
    }),
    description: 'Elastic',
  });

  return items;
};

export interface AwsCatalogIntegrationDetailViewProps {
  readonly onAddAws: () => void;
}

export const AwsCatalogIntegrationDetailView: React.FC<AwsCatalogIntegrationDetailViewProps> = ({
  onAddAws,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    core: { http },
  } = useKibana();
  const { packageInfo, readmeMarkdown, isLoading, error } = useAwsEpmPackageOverview();

  const [selectedTab, setSelectedTab] = useState<OverviewTab>('overview');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const sectionRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [screenshotIndex, setScreenshotIndex] = useState(0);

  const selectItem = useCallback((id: string) => {
    setSelectedItemId(id);
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const headingsWithIndices = useMemo(
    () => extractHeadingsWithIndices(readmeMarkdown),
    [readmeMarkdown]
  );

  const sideNavItems: SideNavItem[] = useMemo(() => {
    const createItem = (
      heading: HeadingWithPosition,
      options: { forceOpen?: boolean } = {}
    ): SideNavItem => {
      const name = getHeadingName(heading.line);
      const id = getReadmeAnchorId(name, heading.position + 1);
      return {
        id,
        name,
        isSelected: selectedItemId === id,
        onClick: () => selectItem(id),
        ...options,
      };
    };

    const navItems: SideNavItem[] = headingsWithIndices.reduce(
      (acc: SideNavItem[], heading: HeadingWithPosition, index: number) => {
        if (heading.line.startsWith('## ')) {
          acc.push(createItem(heading, { forceOpen: true }));
        } else if (heading.line.startsWith('### ')) {
          const subGroup = createItem(heading, { forceOpen: true });
          let i = index + 1;
          while (i < headingsWithIndices.length && headingsWithIndices[i].line.startsWith('#### ')) {
            subGroup.items = subGroup.items ?? [];
            subGroup.items.push(createItem(headingsWithIndices[i], { forceOpen: true }));
            i++;
          }
          const prevIndex = acc.length - 1;
          if (prevIndex >= 0) {
            acc[prevIndex].items = acc[prevIndex].items ?? [];
            acc[prevIndex].items?.push(subGroup);
          } else {
            const fakeItem = createItem({ line: '', position: heading.position }, { forceOpen: true });
            acc.push(fakeItem);
            acc[0].items = acc[0].items ?? [];
            acc[0].items?.push(subGroup);
          }
        }
        return acc;
      },
      []
    );

    const h1 = headingsWithIndices.find((h) => h.line.startsWith('# '));
    if (!h1) {
      return navItems;
    }

    const name = getHeadingName(h1.line);
    const id = getReadmeAnchorId(name, h1.position + 1);
    return [
      {
        id,
        name,
        onClick: () => selectItem(id),
        isSelected: selectedItemId === id,
        items: navItems,
        forceOpen: true,
      },
    ];
  }, [headingsWithIndices, selectItem, selectedItemId]);

  const screenshots = packageInfo?.screenshots ?? [];
  const screenshotUrl =
    packageInfo && screenshots[screenshotIndex]
      ? toEpmPackageImageUrl(http, packageInfo.name, packageInfo.version, screenshots[screenshotIndex])
      : undefined;

  const logoUrl =
    packageInfo?.icons?.[0] != null
      ? toEpmPackageImageUrl(http, packageInfo.name, packageInfo.version, packageInfo.icons[0])
      : undefined;

  const detailsListItems = packageInfo ? buildDetailsListItems(packageInfo) : [];

  return (
    <div
      data-test-subj="streamsAwsCatalogIntegrationDetail"
      css={css`
        flex: 1;
        min-height: 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `}
    >
      <header css={awsCatalogIntegrationHeaderShellCss(euiTheme)}>
        <AwsCatalogIntegrationBrandingRow
          logoSrc={logoUrl}
          logoAlt="Amazon Web Services"
          title="Amazon Web Services"
          titleId="streamsAwsCatalogIntegrationDetailTitle"
          trailing={
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {packageInfo ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    <p style={{ margin: 0, whiteSpace: 'nowrap' }}>
                      {i18n.translate('xpack.streams.dataSources.awsDetail.versionLabel', {
                        defaultMessage: 'Version {version}',
                        values: { version: packageInfo.version },
                      })}
                    </p>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  onClick={onAddAws}
                  data-test-subj="streamsAwsCatalogDetailAddAws"
                >
                  {i18n.translate('xpack.streams.dataSources.awsDetail.addAws', {
                    defaultMessage: 'Add Amazon Web Services',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
        <div
          css={css`
            margin-inline: 0;
            padding-block-start: ${awsCatalogModalContentPadding(euiTheme)};
          `}
        >
          <EuiTabs size="m" bottomBorder>
            <EuiTab
              isSelected={selectedTab === 'overview'}
              onClick={() => setSelectedTab('overview')}
            >
              {i18n.translate('xpack.streams.dataSources.awsDetail.tab.overview', {
                defaultMessage: 'Overview',
              })}
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'settings'}
              onClick={() => setSelectedTab('settings')}
            >
              {i18n.translate('xpack.streams.dataSources.awsDetail.tab.settings', {
                defaultMessage: 'Settings',
              })}
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'configs'}
              onClick={() => setSelectedTab('configs')}
            >
              {i18n.translate('xpack.streams.dataSources.awsDetail.tab.configs', {
                defaultMessage: 'Configs',
              })}
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'apiReference'}
              onClick={() => setSelectedTab('apiReference')}
            >
              {i18n.translate('xpack.streams.dataSources.awsDetail.tab.apiReference', {
                defaultMessage: 'API reference',
              })}
            </EuiTab>
          </EuiTabs>
        </div>
      </header>

      {selectedTab === 'overview' ? (
        <div
          css={css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding-block-start: ${awsCatalogModalContentPadding(euiTheme)};
          `}
        >
          {error ? (
            <EuiText color="danger">
              <p>
                {i18n.translate('xpack.streams.dataSources.awsDetail.loadError', {
                  defaultMessage:
                    'Unable to load AWS integration details. Check Fleet permissions or open Integrations.',
                })}
              </p>
            </EuiText>
          ) : (
            <EuiFlexGroup
              alignItems="flexStart"
              gutterSize="xl"
              css={css`
                min-width: 0;
              `}
            >
              <EuiFlexItem
                grow={false}
                css={css`
                  width: 200px;
                  flex-shrink: 0;
                  position: sticky;
                  top: 0;
                  align-self: flex-start;
                  max-height: 100%;
                  overflow: auto;
                `}
              >
                {sideNavItems.length > 0 ? (
                  <EuiSideNav
                    items={sideNavItems}
                    aria-label={i18n.translate('xpack.streams.dataSources.awsDetail.docNav', {
                      defaultMessage: 'AWS integration documentation',
                    })}
                  />
                ) : isLoading ? (
                  <EuiSkeletonText lines={8} />
                ) : null}
              </EuiFlexItem>

              <EuiFlexItem
                grow={true}
                className="eui-textBreakWord"
                style={{ minWidth: 0 }}
              >
                {packageInfo ? (
                  <AwsCatalogIntegrationReadme
                    http={http}
                    packageName={packageInfo.name}
                    version={packageInfo.version}
                    markdown={readmeMarkdown}
                    isLoading={isLoading}
                    sectionRefs={sectionRefs}
                  />
                ) : (
                  <EuiSkeletonText lines={10} />
                )}
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={css`
                  width: 260px;
                  flex-shrink: 0;
                  position: sticky;
                  top: 0;
                  align-self: flex-start;
                  padding-block-start: 0;

                  .euiImage,
                  .euiImage__wrapper {
                    margin-block-start: 0;
                    padding-block-start: 0;
                  }
                `}
              >
                {screenshotUrl ? (
                  <>
                    <EuiImage
                      size="fullWidth"
                      allowFullScreen
                      hasShadow
                      css={css`
                        margin-block-start: 0;
                      `}
                      alt={
                        screenshots[screenshotIndex]?.title ??
                        i18n.translate('xpack.streams.dataSources.awsDetail.screenshotAlt', {
                          defaultMessage: 'AWS integration screenshot',
                        })
                      }
                      url={screenshotUrl}
                    />
                    {screenshots.length > 1 ? (
                      <>
                        <EuiSpacer size="s" />
                        <EuiFlexGroup gutterSize="xs" responsive={false}>
                          {screenshots.map((shot, index) => (
                            <EuiFlexItem grow={false} key={shot.title ?? index}>
                              <EuiButton
                                size="s"
                                color={screenshotIndex === index ? 'primary' : 'text'}
                                onClick={() => setScreenshotIndex(index)}
                              >
                                {index + 1}
                              </EuiButton>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      </>
                    ) : null}
                    <EuiSpacer size="l" />
                  </>
                ) : isLoading ? (
                  <EuiSkeletonText lines={4} />
                ) : null}

                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate('xpack.streams.dataSources.awsDetail.detailsTitle', {
                      defaultMessage: 'Details',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {detailsListItems.length > 0 ? (
                  <EuiDescriptionList listItems={detailsListItems} />
                ) : (
                  <EuiSkeletonText lines={6} />
                )}
                <EuiSpacer size="l" />
                <EuiLink href="#" iconType="arrowRight" iconSide="right">
                  {i18n.translate('xpack.streams.dataSources.awsDetail.alsoInBeats', {
                    defaultMessage: 'Also available in Beats',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </div>
      ) : (
        <div
          css={css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding-block-start: ${awsCatalogModalContentPadding(euiTheme)};
          `}
        >
          <EuiText color="subdued">
            <p>
              {i18n.translate('xpack.streams.dataSources.awsDetail.tabPlaceholder', {
                defaultMessage:
                  'This tab is available in the full Integrations app. Use Overview to review AWS collection details.',
              })}
            </p>
          </EuiText>
        </div>
      )}
    </div>
  );
};
