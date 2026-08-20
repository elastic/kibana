/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
} from '@elastic/eui';

import {
  VISION_CATEGORIES,
  VISION_INTEGRATIONS,
  getInstalledIntegrations,
  type VisionIntegration,
} from './integrations_data';

type View = 'browse' | 'installed';

// The single, reusable "browse & add integrations" experience — designed to
// be opened from any entry point (the global "Add data" action, the
// integrations catalog page, etc.) so the experience itself stays portable
// and consistent no matter where it's launched from. This is a first,
// intentionally small skeleton: just enough structure (search, category
// browsing, installed view) to validate the shape of the idea before going
// further. Built with EUI components/patterns only.
export const AddIntegrationModal: React.FunctionComponent<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [view, setView] = useState<View>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  const installedIntegrations = useMemo(() => getInstalledIntegrations(), []);

  const visibleIntegrations = useMemo(() => {
    const source = view === 'installed' ? installedIntegrations : VISION_INTEGRATIONS;
    return source.filter((integration) => {
      const matchesCategory =
        view === 'installed' ||
        activeCategoryId === 'all' ||
        integration.categoryIds.includes(activeCategoryId);
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        integration.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [view, activeCategoryId, searchQuery, installedIntegrations]);

  return (
    <EuiModal
      onClose={onClose}
      aria-label="Add integrations"
      data-test-subj="addIntegrationVisionModal"
      style={{ width: 900, maxWidth: '90vw' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>Add integrations</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFieldSearch
          fullWidth
          placeholder="Search integrations"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          isClearable
          aria-label="Search integrations"
          data-test-subj="addIntegrationVisionSearch"
        />
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <EuiFlexItem grow={false} style={{ width: 200 }}>
            <EuiListGroup>
              <EuiListGroupItem
                label="Browse catalog"
                isActive={view === 'browse'}
                onClick={() => setView('browse')}
                data-test-subj="addIntegrationVisionNavBrowse"
              />
              <EuiListGroupItem
                label={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>Installed</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge color="subdued">
                        {installedIntegrations.length}
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                isActive={view === 'installed'}
                onClick={() => setView('installed')}
                data-test-subj="addIntegrationVisionNavInstalled"
              />
            </EuiListGroup>
          </EuiFlexItem>

          <EuiFlexItem style={{ minWidth: 0 }}>
            {view === 'browse' && (
              <>
                <EuiTabs size="s">
                  <EuiTab
                    isSelected={activeCategoryId === 'all'}
                    onClick={() => setActiveCategoryId('all')}
                  >
                    All
                  </EuiTab>
                  {VISION_CATEGORIES.map((category) => (
                    <EuiTab
                      key={category.id}
                      isSelected={activeCategoryId === category.id}
                      onClick={() => setActiveCategoryId(category.id)}
                    >
                      {category.label}
                    </EuiTab>
                  ))}
                </EuiTabs>
                <EuiSpacer size="m" />
              </>
            )}

            {visibleIntegrations.length === 0 ? (
              <EuiEmptyPrompt
                iconType="magnify"
                title={<h3>No integrations found</h3>}
                body={<p>Try a different search term{view === 'browse' ? ' or category' : ''}.</p>}
              />
            ) : (
              <EuiFlexGrid columns={3} gutterSize="m">
                {visibleIntegrations.map((integration) => (
                  <EuiFlexItem key={integration.id}>
                    <IntegrationCard integration={integration} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
};

const IntegrationCard: React.FunctionComponent<{ integration: VisionIntegration }> = ({
  integration,
}) => {
  return (
    <EuiCard
      layout="vertical"
      textAlign="left"
      icon={<EuiIcon type={integration.iconType} size="xl" aria-hidden="true" />}
      title={integration.name}
      description={integration.description}
      titleSize="xs"
      data-test-subj={`addIntegrationVisionCard-${integration.id}`}
      footer={
        integration.isInstalled ? (
          <EuiBadge color="success" iconType="check">
            Installed
          </EuiBadge>
        ) : (
          <EuiButton size="s" iconType="plus" data-test-subj="addIntegrationVisionAddButton">
            Add
          </EuiButton>
        )
      }
    />
  );
};

// Standalone summary shown next to each demo entry point on the skeleton
// page below, so it's obvious both triggers open the exact same component.
export const AddIntegrationModalPortabilityNote: React.FunctionComponent = () => (
  <EuiText size="s" color="subdued">
    <p>
      Both entry points below open this exact same modal component — the browsing experience itself
      is portable and doesn&apos;t belong to either page.
    </p>
  </EuiText>
);

export const HorizontalRuleSpacer: React.FunctionComponent = () => (
  <>
    <EuiSpacer size="l" />
    <EuiHorizontalRule margin="none" />
    <EuiSpacer size="l" />
  </>
);
