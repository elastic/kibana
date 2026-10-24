/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AppHeader, type AppHeaderBadge } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { useLocators } from '../../locator_context';
import { RulesSettingsCallout } from '../../components/rules_setting/rules_settings_callout';
import { RulesSettingsForm } from '../../components/rules_setting/rules_settings_form';
import { useRulesSettingsForm } from '../../components/rules_setting/use_rules_settings_form';

const ALERT_DELETE_CATEGORY_IDS: AlertDeleteCategoryIds[] = [
  'management',
  'observability',
  'securitySolution',
];

const SETTINGS_CONTENT_MAX_WIDTH = 900;

const SETTINGS_PAGE_TITLE = i18n.translate('xpack.triggersActionsUI.rulesSettingsPage.pageTitle', {
  defaultMessage: 'Settings',
});

const BACK_TO_RULES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesSettingsPage.backToRulesButtonLabel',
  {
    defaultMessage: 'Rules',
  }
);

const CLASSIC_RULES_ONLY_BADGE: AppHeaderBadge = {
  label: i18n.translate('xpack.triggersActionsUI.rulesSettingsPage.classicRulesOnlyBadgeLabel', {
    defaultMessage: 'Classic',
  }),
  color: 'hollow',
  'data-test-subj': 'classicRulesOnlyBadge',
};

/**
 * Sub-page for the v1 (Classic) rule settings, reached from the Rules page menu.
 */
export const RulesSettingsPageContainer = () => {
  const history = useHistory();
  const location = useLocation<{ returnPath?: string }>();
  const {
    chrome: { docTitle },
    docLinks,
    setBreadcrumbs,
  } = useKibana().services;
  const { rules } = useLocators();

  const rulesListHref = rules.useUrl({});

  const form = useRulesSettingsForm({
    enabled: true,
    onClose: () => history.push(location.state?.returnPath || '/'),
  });
  const { isSaveDisabled, onSave, onCancel } = form;

  useEffect(() => {
    setBreadcrumbs?.([getRulesBreadcrumbWithHref(), getAlertingSectionBreadcrumb('settings')]);
    docTitle.change(getCurrentDocTitle('settings'));
  }, [docTitle, setBreadcrumbs]);

  return (
    <>
      <AppHeader
        title={SETTINGS_PAGE_TITLE}
        badges={[CLASSIC_RULES_ONLY_BADGE]}
        spacing="bleed"
        back={{ href: rulesListHref, label: BACK_TO_RULES_LABEL }}
        docLink={docLinks.links.alerting.guide}
      />
      <KibanaPageTemplate.Section
        grow={false}
        paddingSize="none"
        restrictWidth={SETTINGS_CONTENT_MAX_WIDTH}
        data-test-subj="rulesSettingsPage"
      >
        <EuiSpacer size="l" />
        <RulesSettingsCallout />
        <EuiSpacer size="l" />
        <RulesSettingsForm form={form} alertDeleteCategoryIds={ALERT_DELETE_CATEGORY_IDS} />
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="rulesSettingsPageCancelButton" onClick={onCancel}>
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettingsPage.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="rulesSettingsPageSaveButton"
              onClick={onSave}
              disabled={isSaveDisabled}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettingsPage.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </>
  );
};
