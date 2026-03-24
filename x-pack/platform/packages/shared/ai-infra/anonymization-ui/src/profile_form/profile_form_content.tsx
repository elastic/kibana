/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiIcon, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isGlobalAnonymizationProfileTarget } from '@kbn/anonymization-common';
import { FieldRulesPanel } from './panels/field_rules_panel/field_rules_panel';
import { NerRulesPanel } from './panels/ner_rules_panel/ner_rules_panel';
import { PreviewPanel } from './panels/preview_panel/preview_panel';
import { RegexRulesPanel } from './panels/regex_rules_panel/regex_rules_panel';
import { ProfileBasicsSection } from './sections/basics_section';
import { ProfileFormNotices } from './sections/notices';
import { useProfileFormContext } from './profile_form_context';

interface ProfileTab {
  id: string;
  name: React.ReactNode;
  content: React.ReactNode;
}

const renderTabName = ({
  label,
  hasError,
  errorAriaLabelId,
  errorAriaDefaultMessage,
  errorTestSubj,
}: {
  label: string;
  hasError: boolean;
  errorAriaLabelId: string;
  errorAriaDefaultMessage: string;
  errorTestSubj: string;
}) => (
  <span>
    {label}
    {hasError ? (
      <>
        {' '}
        <EuiIcon
          type="warning"
          color="danger"
          size="s"
          aria-label={i18n.translate(errorAriaLabelId, {
            defaultMessage: errorAriaDefaultMessage,
          })}
          data-test-subj={errorTestSubj}
        />
      </>
    ) : null}
  </span>
);

const ProfileFormTabs = ({ isGlobalProfile }: { isGlobalProfile: boolean }) => {
  const {
    fieldRules,
    fieldRulesError,
    isManageMode,
    isSubmitting,
    nerRulesError,
    onFieldRulesChange,
    regexRulesError,
    submitAttemptCount,
    targetId,
    targetIdField,
  } = useProfileFormContext();

  const hasFieldRulesError = Boolean(fieldRulesError);
  const hasRegexRulesError = Boolean(regexRulesError);
  const hasNerRulesError = Boolean(nerRulesError);

  const tabs = useMemo<ProfileTab[]>(
    () => [
      ...(isGlobalProfile
        ? []
        : [
            {
              id: 'fieldRules',
              name: renderTabName({
                label: i18n.translate('anonymizationUi.profiles.flyout.tabs.fieldRules', {
                  defaultMessage: 'Field rules',
                }),
                hasError: hasFieldRulesError,
                errorAriaLabelId: 'anonymizationUi.profiles.flyout.tabs.fieldRulesErrorAriaLabel',
                errorAriaDefaultMessage: 'Field rules tab has validation errors',
                errorTestSubj: 'anonymizationProfilesTabError-fieldRules',
              }),
              content: (
                <FieldRulesPanel
                  fieldRules={fieldRules}
                  onFieldRulesChange={onFieldRulesChange}
                  validationError={fieldRulesError}
                  selectedTargetName={
                    targetIdField.selectedTargetDisplayName ?? (targetId.trim() || undefined)
                  }
                  isManageMode={isManageMode}
                  isSubmitting={isSubmitting}
                />
              ),
            },
          ]),
      {
        id: 'regexRules',
        name: renderTabName({
          label: i18n.translate('anonymizationUi.profiles.flyout.tabs.regexRules', {
            defaultMessage: 'Regex rules',
          }),
          hasError: hasRegexRulesError,
          errorAriaLabelId: 'anonymizationUi.profiles.flyout.tabs.regexRulesErrorAriaLabel',
          errorAriaDefaultMessage: 'Regex rules tab has validation errors',
          errorTestSubj: 'anonymizationProfilesTabError-regexRules',
        }),
        content: <RegexRulesPanel />,
      },
      {
        id: 'nerRules',
        name: renderTabName({
          label: i18n.translate('anonymizationUi.profiles.flyout.tabs.nerRules', {
            defaultMessage: 'NER rules',
          }),
          hasError: hasNerRulesError,
          errorAriaLabelId: 'anonymizationUi.profiles.flyout.tabs.nerRulesErrorAriaLabel',
          errorAriaDefaultMessage: 'NER rules tab has validation errors',
          errorTestSubj: 'anonymizationProfilesTabError-nerRules',
        }),
        content: <NerRulesPanel />,
      },
      ...(isGlobalProfile
        ? []
        : [
            {
              id: 'preview',
              name: i18n.translate('anonymizationUi.profiles.flyout.tabs.preview', {
                defaultMessage: 'Preview',
              }),
              content: <PreviewPanel />,
            },
          ]),
    ],
    [
      isGlobalProfile,
      hasFieldRulesError,
      hasRegexRulesError,
      hasNerRulesError,
      fieldRules,
      onFieldRulesChange,
      fieldRulesError,
      targetIdField.selectedTargetDisplayName,
      targetId,
      isManageMode,
      isSubmitting,
    ]
  );

  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(tabs[0]?.id);

  const errorTabId = useMemo(() => {
    if (!isGlobalProfile && hasFieldRulesError) {
      return 'fieldRules';
    }
    if (hasRegexRulesError) {
      return 'regexRules';
    }
    if (hasNerRulesError) {
      return 'nerRules';
    }
    return undefined;
  }, [hasFieldRulesError, hasNerRulesError, hasRegexRulesError, isGlobalProfile]);

  useEffect(() => {
    if (!errorTabId) {
      return;
    }
    setSelectedTabId(errorTabId);
  }, [errorTabId, submitAttemptCount]);

  useEffect(() => {
    if (tabs.some((tab) => tab.id === selectedTabId)) {
      return;
    }
    setSelectedTabId(tabs[0]?.id);
  }, [selectedTabId, tabs]);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={(tab) => setSelectedTabId(tab.id)}
      data-test-subj="anonymizationProfilesFlyoutTabs"
    />
  );
};

export const ProfileFormContent = () => {
  const { fieldRules, isEdit, targetType, targetId } = useProfileFormContext();

  const isGlobalProfile = isGlobalAnonymizationProfileTarget(targetType, targetId);
  const hasLoadedDataSource = isEdit || targetId.trim().length > 0 || fieldRules.length > 0;

  return (
    <>
      <ProfileFormNotices />
      <ProfileBasicsSection />
      {hasLoadedDataSource ? (
        <>
          <EuiSpacer size="m" />
          <ProfileFormTabs isGlobalProfile={isGlobalProfile} />
        </>
      ) : (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="info"
            title={i18n.translate('anonymizationUi.profiles.flyout.loadFieldsHintTitle', {
              defaultMessage: 'Select a target to load field rules',
            })}
            data-test-subj="anonymizationProfilesSelectTargetHint"
          >
            <p>
              {i18n.translate('anonymizationUi.profiles.flyout.loadFieldsHintBody', {
                defaultMessage:
                  'To configure field rules, first select a target index, index pattern, or data view.',
              })}
            </p>
          </EuiCallOut>
        </>
      )}
    </>
  );
};
