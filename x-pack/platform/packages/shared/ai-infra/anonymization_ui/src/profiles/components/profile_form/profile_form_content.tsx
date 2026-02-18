/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiIcon, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldRulesPanel } from '../field_rules/field_rules_panel';
import { NerRulesPanel } from './panels/ner_rules_panel';
import { PreviewPanel } from './panels/preview_panel';
import { RegexRulesPanel } from './panels/regex_rules_panel';
import { ProfileBasicsSection } from './sections/basics_section';
import { ProfileFormNotices } from './sections/notices';
import { useProfileFormContext } from './profile_form_context';

export const ProfileFormContent = () => {
  const {
    fieldRules,
    fieldRulesError,
    isEdit,
    isManageMode,
    isSubmitting,
    nerRulesError,
    onFieldRulesChange,
    regexRulesError,
    targetId,
    targetIdField,
  } = useProfileFormContext();

  const hasLoadedDataSource = isEdit || targetId.trim().length > 0 || fieldRules.length > 0;
  const [selectedTabId, setSelectedTabId] = useState('fieldRules');
  const hasFieldRulesError = Boolean(fieldRulesError);
  const hasRegexRulesError = Boolean(regexRulesError);
  const hasNerRulesError = Boolean(nerRulesError);

  useEffect(() => {
    if (hasFieldRulesError) {
      setSelectedTabId('fieldRules');
      return;
    }
    if (hasRegexRulesError) {
      setSelectedTabId('regexRules');
      return;
    }
    if (hasNerRulesError) {
      setSelectedTabId('nerRules');
    }
  }, [hasFieldRulesError, hasRegexRulesError, hasNerRulesError]);

  const profileTabs = useMemo(
    () => [
      {
        id: 'fieldRules',
        name: (
          <span>
            {i18n.translate('anonymizationUi.profiles.flyout.tabs.fieldRules', {
              defaultMessage: 'Field rules',
            })}
            {hasFieldRulesError ? (
              <>
                {' '}
                <EuiIcon
                  type="warning"
                  color="danger"
                  size="s"
                  aria-label={i18n.translate(
                    'anonymizationUi.profiles.flyout.tabs.fieldRulesErrorAriaLabel',
                    {
                      defaultMessage: 'Field rules tab has validation errors',
                    }
                  )}
                  data-test-subj="anonymizationProfilesTabError-fieldRules"
                />
              </>
            ) : null}
          </span>
        ),
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
      {
        id: 'regexRules',
        name: (
          <span>
            {i18n.translate('anonymizationUi.profiles.flyout.tabs.regexRules', {
              defaultMessage: 'Regex rules',
            })}
            {hasRegexRulesError ? (
              <>
                {' '}
                <EuiIcon
                  type="warning"
                  color="danger"
                  size="s"
                  aria-label={i18n.translate(
                    'anonymizationUi.profiles.flyout.tabs.regexRulesErrorAriaLabel',
                    {
                      defaultMessage: 'Regex rules tab has validation errors',
                    }
                  )}
                  data-test-subj="anonymizationProfilesTabError-regexRules"
                />
              </>
            ) : null}
          </span>
        ),
        content: <RegexRulesPanel />,
      },
      {
        id: 'nerRules',
        name: (
          <span>
            {i18n.translate('anonymizationUi.profiles.flyout.tabs.nerRules', {
              defaultMessage: 'NER rules',
            })}
            {hasNerRulesError ? (
              <>
                {' '}
                <EuiIcon
                  type="warning"
                  color="danger"
                  size="s"
                  aria-label={i18n.translate(
                    'anonymizationUi.profiles.flyout.tabs.nerRulesErrorAriaLabel',
                    {
                      defaultMessage: 'NER rules tab has validation errors',
                    }
                  )}
                  data-test-subj="anonymizationProfilesTabError-nerRules"
                />
              </>
            ) : null}
          </span>
        ),
        content: <NerRulesPanel />,
      },
      {
        id: 'preview',
        name: i18n.translate('anonymizationUi.profiles.flyout.tabs.preview', {
          defaultMessage: 'Preview',
        }),
        content: <PreviewPanel />,
      },
    ],
    [
      fieldRules,
      fieldRulesError,
      hasFieldRulesError,
      hasNerRulesError,
      hasRegexRulesError,
      isManageMode,
      isSubmitting,
      onFieldRulesChange,
      targetId,
      targetIdField.selectedTargetDisplayName,
    ]
  );

  return (
    <>
      <ProfileFormNotices />
      <ProfileBasicsSection />
      {hasLoadedDataSource ? (
        <>
          <EuiSpacer size="m" />
          <EuiTabbedContent
            tabs={profileTabs}
            selectedTab={profileTabs.find((tab) => tab.id === selectedTabId) ?? profileTabs[0]}
            onTabClick={(tab) => setSelectedTabId(tab.id)}
            data-test-subj="anonymizationProfilesFlyoutTabs"
          />
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
