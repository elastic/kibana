/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FieldRule, NerRule, RegexRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import type {
  AnonymizationUiServices,
  FetchPreviewDocument,
  TrustedNerModelOption,
} from '../../../contracts';
import type { ProfilesApiError } from '../../services/profiles/errors';
import type { TargetType } from '../../types';
import { FieldRulesPanel } from '../field_rules/field_rules_panel';
import { NerRulesPanel } from './ner_rules_panel';
import { PreviewPanel } from './preview_panel';
import { ProfileBasicsSection } from './basics_section';
import { ProfileFlyoutFooter } from './footer';
import { ProfileFlyoutNotices } from './notices';
import { RegexRulesPanel } from './regex_rules_panel';
import { useTargetIdField } from './hooks/use_target_id_field';
import { ProfileFlyoutContextProvider } from './context';

export interface ProfileFlyoutProps {
  isEdit: boolean;
  isManageMode: boolean;
  name: string;
  description: string;
  targetType: TargetType;
  targetId: string;
  fieldRules: FieldRule[];
  regexRules: RegexRule[];
  nerRules: NerRule[];
  nameError?: string;
  targetIdError?: string;
  fieldRulesError?: string;
  regexRulesError?: string;
  nerRulesError?: string;
  submitError?: ProfilesApiError;
  hasConflict?: boolean;
  isSubmitting: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTargetTypeChange: (targetType: TargetType) => void;
  onTargetIdChange: (targetId: string) => void;
  onFieldRulesChange: (rules: FieldRule[]) => void;
  onRegexRulesChange: (rules: RegexRule[]) => void;
  onNerRulesChange: (rules: NerRule[]) => void;
  listTrustedNerModels?: () => Promise<TrustedNerModelOption[]>;
  fetchPreviewDocument?: FetchPreviewDocument;
  fetch: AnonymizationUiServices['http']['fetch'];
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}

export const ProfileFlyout = (props: ProfileFlyoutProps) => {
  const {
    fetch,
    fieldRules,
    isEdit,
    onCancel,
    onFieldRulesChange,
    onTargetIdChange,
    targetId,
    targetType,
  } = props;

  const targetIdField = useTargetIdField({
    targetType,
    targetId,
    fetch,
    onFieldRulesChange,
    onTargetIdChange,
  });

  const hasLoadedDataSource = isEdit || targetId.trim().length > 0 || fieldRules.length > 0;
  const [selectedTabId, setSelectedTabId] = useState('fieldRules');
  const hasFieldRulesError = Boolean(props.fieldRulesError);
  const hasRegexRulesError = Boolean(props.regexRulesError);
  const hasNerRulesError = Boolean(props.nerRulesError);
  const onSubmitWithTargetValidation = async () => {
    const isTargetValid = await targetIdField.validateAndHydrateTargetId();
    if (!isTargetValid) {
      return;
    }
    await props.onSubmit();
  };

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
            validationError={props.fieldRulesError}
            selectedTargetName={
              targetIdField.selectedTargetDisplayName ?? (targetId.trim() || undefined)
            }
            isManageMode={props.isManageMode}
            isSubmitting={props.isSubmitting}
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
      onFieldRulesChange,
      props.fieldRulesError,
      props.isManageMode,
      props.isSubmitting,
      targetId,
      targetIdField.selectedTargetDisplayName,
      hasFieldRulesError,
      hasRegexRulesError,
      hasNerRulesError,
    ]
  );

  return (
    <EuiFlyout
      aria-label={
        isEdit
          ? i18n.translate('anonymizationUi.profiles.flyout.ariaLabel.edit', {
              defaultMessage: 'Edit profile',
            })
          : i18n.translate('anonymizationUi.profiles.flyout.ariaLabel.create', {
              defaultMessage: 'Create profile',
            })
      }
      onClose={onCancel}
      ownFocus
      size="m"
      data-test-subj="anonymizationProfilesProfileFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {isEdit
              ? i18n.translate('anonymizationUi.profiles.flyout.title.edit', {
                  defaultMessage: 'Edit profile',
                })
              : i18n.translate('anonymizationUi.profiles.flyout.title.create', {
                  defaultMessage: 'Create profile',
                })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('anonymizationUi.profiles.flyout.privacyGuidanceDescription', {
              defaultMessage:
                'Define privacy settings for event data sent to third-party LLM providers. Create one profile per target (index, index pattern or data view) per space. Choose which fields to include and which to anonymize by replacing values with mask tokens.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <ProfileFlyoutContextProvider
        value={{ ...props, onSubmit: onSubmitWithTargetValidation, targetIdField }}
      >
        <EuiFlyoutBody>
          <ProfileFlyoutNotices />
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
        </EuiFlyoutBody>
        <ProfileFlyoutFooter />
      </ProfileFlyoutContextProvider>
    </EuiFlyout>
  );
};
