/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { experimentalBadge } from '../../components/experimental_badge';
import { paths } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useInstallDisabledRule } from '../../hooks/use_install_disabled_rule';
import { RuleLibraryTable } from './components/rule_library_table';

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const ONE_CLICK_INSTALL_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.oneClickInstall', {
  defaultMessage: '1 click install',
});

export const RuleLibraryPage = () => {
  useBreadcrumbs('rule_library');
  const [oneClickInstall, setOneClickInstall] = useState(false);
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null);
  const installDisabledRuleMutation = useInstallDisabledRule();
  const { flyout, openCreateFromTemplate, openEditFlyout } = useComposeDiscoverFlyout({
    createSuccessRedirectPath: paths.ruleList,
  });

  const handleCreateFromTemplate = useCallback(
    (templateId: string, createData: CreateRuleData) => {
      if (oneClickInstall) {
        setInstallingTemplateId(templateId);
        installDisabledRuleMutation.mutate(createData, {
          onSuccess: (rule) => {
            openEditFlyout(rule, { initialStepId: 'notifications' });
          },
          onSettled: () => {
            setInstallingTemplateId(null);
          },
        });
        return;
      }
      openCreateFromTemplate(createData);
    },
    [installDisabledRuleMutation, oneClickInstall, openCreateFromTemplate, openEditFlyout]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={RULE_LIBRARY_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
        back={{
          href: paths.ruleList,
          label: i18n.translate('xpack.alertingV2.ruleLibrary.header.backToRulesLabel', {
            defaultMessage: 'Rules',
          }),
        }}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={ONE_CLICK_INSTALL_LABEL}
            checked={oneClickInstall}
            disabled={installingTemplateId != null}
            onChange={(event) => setOneClickInstall(event.target.checked)}
            data-test-subj="ruleLibraryOneClickInstallSwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <RuleLibraryTable
        onCreateFromTemplate={handleCreateFromTemplate}
        oneClickInstall={oneClickInstall}
        installingTemplateId={installingTemplateId}
      />
      {flyout}
    </>
  );
};
