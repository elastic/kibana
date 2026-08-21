/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { CardIcon } from '../../../../../../components/package_icon';
import { useGetCategoriesQuery, useGetPackagesQuery } from '../../../../hooks';
import type { PackageListItem } from '../../../../../../types';

// Real EPR category ids don't map 1:1 onto the reference design's sidebar
// (which lists a handful of illustrative groupings), so the sidebar shows
// whatever categories the live catalog actually returns, sorted by size.
const MAX_SIDEBAR_CATEGORIES = 9;

type SidebarView = 'browse' | 'installed' | 'for_you';
type ContentTab = 'all' | 'integration' | 'content' | 'connectors' | 'policies';

const CARD_HEIGHT = 92;

const ComingSoon: React.FunctionComponent<{ title: string }> = ({ title }) => (
  <EuiEmptyPrompt
    iconType="clock"
    titleSize="s"
    title={<h3>{title}</h3>}
    body={<p>Not built yet — coming in a later pass of this prototype.</p>}
  />
);

const IntegrationCard: React.FunctionComponent<{ item: PackageListItem }> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        height: CARD_HEIGHT,
        padding: euiTheme.size.m,
        border: euiTheme.border.thin,
        borderRadius: euiTheme.border.radius.medium,
        background: euiTheme.colors.emptyShade,
      }}
      data-test-subj={`addIntegrationVisionCard-${item.id}`}
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="flexStart"
        responsive={false}
        style={{ height: '100%' }}
      >
        <EuiFlexItem grow={false}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: euiTheme.colors.backgroundBaseSubdued,
              border: euiTheme.border.thin,
              borderRadius: euiTheme.border.radius.medium,
            }}
          >
            <CardIcon
              icons={item.icons}
              packageName={item.name}
              integrationName={item.integration}
              version={item.version}
              size="l"
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0, height: '100%' }}>
          <EuiFlexGroup direction="column" gutterSize="xs" style={{ height: '100%' }}>
            <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
              <EuiTitle size="xxs">
                <h3 className="eui-textTruncate">{item.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={true} style={{ minWidth: 0, justifyContent: 'flex-end' }}>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false} style={{ overflow: 'hidden' }}>
                {(item.categories ?? []).slice(0, 2).map((category) => (
                  <EuiFlexItem grow={false} key={category}>
                    <EuiBadge color="hollow">{category}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={`Add ${item.title}`} disableScreenReaderOutput>
            <EuiButtonIcon
              display="base"
              color="text"
              iconType="plus"
              size="m"
              aria-label={`Add ${item.title}`}
              data-test-subj="addIntegrationVisionAddButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

// The redesigned, pixel-matched "Add integrations" modal (per the Figma
// vision doc) — search, a left rail (Browse all / Installed / For you +
// live categories), a secondary content-type tab row, and a scrollable
// card grid backed by the real EPR catalog (useGetPackagesQuery) and real
// package icons (CardIcon). Descriptions are intentionally omitted for now
// per design feedback; only "Browse all" / "All" are wired up — the other
// nav items are present but inert until a later pass.
export const AddIntegrationModal: React.FunctionComponent<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [sidebarView, setSidebarView] = useState<SidebarView>('browse');
  const [contentTab, setContentTab] = useState<ContentTab>('all');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: packagesData, isLoading: isLoadingPackages } = useGetPackagesQuery({
    prerelease: false,
  });
  const { data: categoriesData } = useGetCategoriesQuery({});

  const allPackages = useMemo(() => packagesData?.items ?? [], [packagesData]);
  const installedPackages = useMemo(
    () => allPackages.filter((pkg) => pkg.status === 'installed'),
    [allPackages]
  );

  const sidebarCategories = useMemo(
    () =>
      (categoriesData?.items ?? [])
        .filter((category) => !category.parent_id)
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_SIDEBAR_CATEGORIES),
    [categoriesData]
  );

  const visiblePackages = useMemo(() => {
    const source = sidebarView === 'installed' ? installedPackages : allPackages;
    return source.filter((pkg) => {
      const matchesTab =
        contentTab === 'all' ||
        (contentTab === 'integration' && pkg.type === 'integration') ||
        (contentTab === 'content' && pkg.type === 'content');
      const matchesCategory =
        !activeCategoryId || ((pkg.categories ?? []) as string[]).includes(activeCategoryId);
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        pkg.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesTab && matchesCategory && matchesQuery;
    });
  }, [sidebarView, allPackages, installedPackages, contentTab, activeCategoryId, searchQuery]);

  const isPlaceholderTab = contentTab === 'connectors' || contentTab === 'policies';
  const isPlaceholderSidebarView = sidebarView === 'for_you';

  return (
    <EuiModal
      onClose={onClose}
      aria-label="Sources"
      data-test-subj="addIntegrationVisionModal"
      maxWidth={1200}
      style={{ width: 1200, height: 720 }}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiModalHeaderTitle>Sources</EuiModalHeaderTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="pencil" iconSide="right">
                  OTel-Native
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>Connect your systems and get full visibility into logs, metrics, and traces.</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <EuiFieldSearch
          fullWidth
          placeholder="Search integrations, content packages, etc."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          isClearable
          aria-label="Search integrations, content packages, etc."
          data-test-subj="addIntegrationVisionSearch"
        />
        <EuiSpacer size="s" />

        {/* Sort/filter controls are visual-only for now — wiring them up is
            deferred to a later pass, per design feedback. */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" iconType="chevronSingleDown" iconSide="right" color="text">
              Sort fields
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {['Filter', 'Filter', 'Filter'].map((label, i) => (
                <EuiFlexItem grow={false} key={i}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="chevronSingleDown"
                    iconSide="right"
                    color="text"
                  >
                    {label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="l" style={{ flex: 1, minHeight: 0 }}>
          <EuiFlexItem grow={false} style={{ width: 220 }}>
            <EuiListGroup data-test-subj="addIntegrationVisionSidebarNav">
              <EuiListGroupItem
                label={
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>Browse all</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge color="subdued">
                        {allPackages.length}
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                isActive={sidebarView === 'browse'}
                onClick={() => setSidebarView('browse')}
                data-test-subj="addIntegrationVisionNavBrowse"
              />
              <EuiListGroupItem
                label={
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>Installed</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge color="subdued">
                        {installedPackages.length}
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                isActive={sidebarView === 'installed'}
                onClick={() => setSidebarView('installed')}
                data-test-subj="addIntegrationVisionNavInstalled"
              />
              <EuiListGroupItem
                label={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>For you</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="sparkles" size="s" color="accent" aria-hidden="true" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                isActive={sidebarView === 'for_you'}
                onClick={() => setSidebarView('for_you')}
                data-test-subj="addIntegrationVisionNavForYou"
              />
            </EuiListGroup>

            {sidebarView === 'browse' && (
              <>
                <EuiSpacer size="m" />
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  <strong>CATEGORIES</strong>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiListGroup data-test-subj="addIntegrationVisionCategories">
                  {sidebarCategories.map((category) => (
                    <EuiListGroupItem
                      key={category.id}
                      label={
                        <EuiFlexGroup
                          gutterSize="s"
                          alignItems="center"
                          justifyContent="spaceBetween"
                          responsive={false}
                        >
                          <EuiFlexItem grow={false} className="eui-textTruncate">
                            {category.title}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiNotificationBadge color="subdued">
                              {category.count}
                            </EuiNotificationBadge>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      isActive={activeCategoryId === category.id}
                      onClick={() =>
                        setActiveCategoryId((current) =>
                          current === category.id ? null : category.id
                        )
                      }
                    />
                  ))}
                </EuiListGroup>
              </>
            )}
          </EuiFlexItem>

          <EuiFlexItem style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <EuiTabs size="s" data-test-subj="addIntegrationVisionTabs">
              <EuiTab isSelected={contentTab === 'all'} onClick={() => setContentTab('all')}>
                All
              </EuiTab>
              <EuiTab
                isSelected={contentTab === 'integration'}
                onClick={() => setContentTab('integration')}
              >
                Integrations
              </EuiTab>
              <EuiTab
                isSelected={contentTab === 'content'}
                onClick={() => setContentTab('content')}
              >
                Content packages
              </EuiTab>
              <EuiTab
                isSelected={contentTab === 'connectors'}
                onClick={() => setContentTab('connectors')}
              >
                Connectors
              </EuiTab>
              <EuiTab
                isSelected={contentTab === 'policies'}
                onClick={() => setContentTab('policies')}
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>Policies</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip content="Existing agent and package policies." position="right" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiTab>
            </EuiTabs>
            <EuiSpacer size="m" />

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {isPlaceholderSidebarView ? (
                <ComingSoon title="For you" />
              ) : isPlaceholderTab ? (
                <ComingSoon title={contentTab === 'connectors' ? 'Connectors' : 'Policies'} />
              ) : isLoadingPackages ? (
                <EuiFlexGroup
                  justifyContent="center"
                  alignItems="center"
                  style={{ height: '100%' }}
                >
                  <EuiLoadingSpinner size="xl" />
                </EuiFlexGroup>
              ) : visiblePackages.length === 0 ? (
                <EuiEmptyPrompt
                  iconType="magnify"
                  titleSize="s"
                  title={<h3>No integrations found</h3>}
                  body={<p>Try a different search term or category.</p>}
                />
              ) : (
                <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="addIntegrationVisionGrid">
                  {visiblePackages.map((pkg) => (
                    <EuiFlexItem key={pkg.id}>
                      <IntegrationCard item={pkg} />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGrid>
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
};
