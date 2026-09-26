/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { useAnonymizationSettings } from '../hooks/use_anonymization_settings';
import { BuiltInPatternsTable } from './built_in_patterns_table';
import { CustomPatternsTable } from './custom_patterns_table';
import { PatternFlyout } from './pattern_flyout';
import { PatternTesterTab } from './pattern_tester_tab';
import { SettingsTab } from './settings_tab';
import { useKibana } from '../hooks/use_kibana';

interface AnonymizationSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

const pageTitle = i18n.translate('xpack.aiAnonymizationSettings.pageTitle', {
  defaultMessage: 'Anonymization',
});

type TabId = 'builtin' | 'custom' | 'tester' | 'settings';

export const AnonymizationSettingsApp: React.FC<AnonymizationSettingsAppProps> = ({
  setBreadcrumbs,
}) => {
  const {
    services: { application },
  } = useKibana();
  const canEditAdvancedSettings = Boolean(application.capabilities.advancedSettings?.save);

  const {
    isLoading,
    maskingEnabled,
    onFailure,
    builtInPatterns,
    customPatterns,
    setMaskingEnabled,
    setOnFailure,
    setRuleEnabled,
    addCustomPattern,
    updateCustomPattern,
    deleteCustomPattern,
  } = useAnonymizationSettings();

  const [selectedTab, setSelectedTab] = useState<TabId>('builtin');
  const [flyoutPattern, setFlyoutPattern] = useState<RegexAnonymizationRule | undefined>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.aiAnonymizationSettings.breadcrumbs.ai', {
          defaultMessage: 'AI',
        }),
      },
      {
        text: pageTitle,
      },
    ]);
  }, [setBreadcrumbs]);

  const tabs = [
    {
      id: 'builtin',
      label: i18n.translate('xpack.aiAnonymizationSettings.tabs.builtIn', {
        defaultMessage: 'Built-in patterns',
      }),
      badge: builtInPatterns.length,
      isSelected: selectedTab === 'builtin',
      onClick: () => setSelectedTab('builtin'),
      'data-test-subj': 'aiAnonymizationSettingsTab-builtin',
    },
    {
      id: 'custom',
      label: i18n.translate('xpack.aiAnonymizationSettings.tabs.custom', {
        defaultMessage: 'Custom patterns',
      }),
      badge: customPatterns.length,
      isSelected: selectedTab === 'custom',
      onClick: () => setSelectedTab('custom'),
      'data-test-subj': 'aiAnonymizationSettingsTab-custom',
    },
    {
      id: 'tester',
      label: i18n.translate('xpack.aiAnonymizationSettings.tabs.tester', {
        defaultMessage: 'Pattern tester',
      }),
      isSelected: selectedTab === 'tester',
      onClick: () => setSelectedTab('tester'),
      'data-test-subj': 'aiAnonymizationSettingsTab-tester',
    },
    {
      id: 'settings',
      label: i18n.translate('xpack.aiAnonymizationSettings.tabs.settings', {
        defaultMessage: 'Settings',
      }),
      isSelected: selectedTab === 'settings',
      onClick: () => setSelectedTab('settings'),
      'data-test-subj': 'aiAnonymizationSettingsTab-settings',
    },
  ];

  const techPreviewBadge = {
    label: i18n.translate('xpack.aiAnonymizationSettings.techPreviewBadge', {
      defaultMessage: 'Tech Preview',
    }),
    color: 'hollow' as const,
    'data-test-subj': 'aiAnonymizationSettingsTechPreviewBadge',
  };

  const enabledRules = [...builtInPatterns, ...customPatterns].filter((rule) => rule.enabled);

  const closeFlyout = () => {
    setIsFlyoutOpen(false);
    setFlyoutPattern(undefined);
  };

  const handleSavePattern = async (pattern: Parameters<typeof addCustomPattern>[0]) => {
    if (flyoutPattern?.id) {
      await updateCustomPattern(flyoutPattern.id, pattern);
    } else {
      await addCustomPattern(pattern);
    }
  };

  return (
    <div data-test-subj="aiAnonymizationSettingsPage">
      <AppHeader title={pageTitle} spacing="bleed" tabs={tabs} badges={[techPreviewBadge]} />
      <EuiPageSection paddingSize="l">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate('xpack.aiAnonymizationSettings.maskingEnabledLabel', {
                defaultMessage: 'Masking enabled',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.aiAnonymizationSettings.maskingEnabledTooltip', {
                defaultMessage:
                  'Master switch for anonymization. When off, no patterns are applied and content is sent to the model unmasked.',
              })}
              position="bottom"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              showLabel={false}
              label=""
              checked={maskingEnabled}
              disabled={!canEditAdvancedSettings}
              onChange={(e) => setMaskingEnabled(e.target.checked)}
              data-test-subj="aiAnonymizationSettingsHeaderMaskingSwitch"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {!isLoading && (
          <>
            {selectedTab === 'builtin' && (
              <BuiltInPatternsTable
                patterns={builtInPatterns}
                onToggle={setRuleEnabled}
                isSavingEnabled={canEditAdvancedSettings}
              />
            )}
            {selectedTab === 'custom' && (
              <CustomPatternsTable
                patterns={customPatterns}
                onToggle={setRuleEnabled}
                onEdit={(pattern) => {
                  setFlyoutPattern(pattern);
                  setIsFlyoutOpen(true);
                }}
                onDelete={deleteCustomPattern}
                onAddClick={() => {
                  setFlyoutPattern(undefined);
                  setIsFlyoutOpen(true);
                }}
                isSavingEnabled={canEditAdvancedSettings}
              />
            )}
            {selectedTab === 'tester' && (
              <PatternTesterTab builtInPatterns={builtInPatterns} customPatterns={customPatterns} />
            )}
            {selectedTab === 'settings' && (
              <SettingsTab
                maskingEnabled={maskingEnabled}
                onFailure={onFailure}
                onMaskingEnabledChange={setMaskingEnabled}
                onOnFailureChange={setOnFailure}
                isSavingEnabled={canEditAdvancedSettings}
              />
            )}
          </>
        )}
      </EuiPageSection>

      {isFlyoutOpen && (
        <PatternFlyout
          pattern={flyoutPattern}
          enabledRules={enabledRules}
          onSave={handleSavePattern}
          onClose={closeFlyout}
        />
      )}
    </div>
  );
};
