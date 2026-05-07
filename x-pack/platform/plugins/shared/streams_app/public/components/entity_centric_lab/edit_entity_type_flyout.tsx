/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FakeEntityType } from './fake_entity_types';

interface Props {
  entityType: FakeEntityType;
  onClose: () => void;
}

const TAB_IDS = ['general', 'health', 'ownership', 'flyoutContent', 'subsets'] as const;
type TabId = (typeof TAB_IDS)[number];

export const EditEntityTypeFlyout = ({ entityType, onClose }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'editEntityTypeFlyoutTitle' });
  const [selectedTab, setSelectedTab] = useState<TabId>('general');

  const tabs = useMemo<Array<{ id: TabId; label: string }>>(
    () => [
      {
        id: 'general',
        label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabs.general', {
          defaultMessage: 'General',
        }),
      },
      {
        id: 'health',
        label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabs.health', {
          defaultMessage: 'Health',
        }),
      },
      {
        id: 'ownership',
        label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabs.ownership', {
          defaultMessage: 'Ownership',
        }),
      },
      {
        id: 'flyoutContent',
        label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabs.flyoutContent', {
          defaultMessage: 'Flyout content',
        }),
      },
      {
        id: 'subsets',
        label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabs.subsets', {
          defaultMessage: 'Subsets',
        }),
      },
    ],
    []
  );

  const activeLabel = tabs.find((tab) => tab.id === selectedTab)?.label ?? '';

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="entityCentricLabEditEntityTypeFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>
                {i18n.translate('xpack.streams.entityCentricLab.editFlyout.title', {
                  defaultMessage: 'Edit {name} entity type',
                  values: { name: entityType.name },
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.labBadgeLabel', {
                defaultMessage: 'Lab',
              })}
              size="s"
              color="hollow"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.lastUpdated', {
            defaultMessage: 'Last update: 12.05 14:33 (placeholder)',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === selectedTab}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.tabPlaceholder', {
              defaultMessage:
                'Placeholder content for the “{tabLabel}” tab. The full edit flow is not implemented in this prototype.',
              values: { tabLabel: activeLabel },
            })}
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="entityCentricLabEditFlyoutCancel">
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onClose}
                  data-test-subj="entityCentricLabEditFlyoutSave"
                  isDisabled
                >
                  {i18n.translate('xpack.streams.entityCentricLab.editFlyout.save', {
                    defaultMessage: 'Save modifications',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={onClose}
                  data-test-subj="entityCentricLabEditFlyoutNext"
                  isDisabled
                >
                  {i18n.translate('xpack.streams.entityCentricLab.editFlyout.next', {
                    defaultMessage: 'Next step',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
