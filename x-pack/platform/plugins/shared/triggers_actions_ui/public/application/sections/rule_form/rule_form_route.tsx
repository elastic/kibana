/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm } from '@kbn/response-ops-rule-form';
import { AlertConsumers, getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useLocation, useParams } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { useRuleTemplate } from '../../hooks/use_rule_template';
import { RuleTemplateError } from './components/rule_template_error';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

export const RuleFormRoute = () => {
  const {
    http,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
    contentManagement,
    chrome,
    setBreadcrumbs,
    ...startServices
  } = useKibana().services;

  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const {
    id,
    ruleTypeId: ruleTypeIdParams,
    templateId: templateIdParams,
  } = useParams<{
    id?: string;
    ruleTypeId?: string;
    templateId?: string;
  }>();
  const { returnApp, returnPath } = location.state || {};

  const templateId = templateIdParams;

  const {
    data: ruleTemplate,
    error: ruleTemplateError,
    isLoading: isLoadingRuleTemplate,
    isError: isErrorRuleTemplate,
  } = useRuleTemplate({
    templateId,
  });

  const ruleTypeId = ruleTypeIdParams ?? ruleTemplate?.ruleTypeId;

  // Set breadcrumb and page title
  useEffect(() => {
    if (id) {
      setBreadcrumbs([
        getAlertingSectionBreadcrumb('rules', true),
        getAlertingSectionBreadcrumb('editRule'),
      ]);
      chrome.docTitle.change(getCurrentDocTitle('editRule'));
    }
    if (ruleTypeId || templateId) {
      setBreadcrumbs([
        getAlertingSectionBreadcrumb('rules', true),
        getAlertingSectionBreadcrumb('createRule'),
      ]);
      chrome.docTitle.change(getCurrentDocTitle('createRule'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeId, templateId]);

  if (isLoadingRuleTemplate) {
    return <CenterJustifiedSpinner />;
  }

  if (isErrorRuleTemplate) {
    return <RuleTemplateError error={ruleTemplateError as Error} />; // TODO
  }

  return (
    <IntlProvider locale="en">
      <RuleForm
        plugins={{
          http,
          application,
          notifications,
          charts,
          settings,
          data,
          dataViews,
          unifiedSearch,
          docLinks,
          ruleTypeRegistry,
          actionTypeRegistry,
          contentManagement,
          ...startServices,
        }}
        initialValues={ruleTemplate}
        id={id}
        ruleTypeId={ruleTypeId}
        onCancel={() => {
          if (returnApp && returnPath) {
            application.navigateToApp(returnApp, { path: returnPath });
          } else {
            application.navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/rules`,
            });
          }
        }}
        onSubmit={(ruleId) => {
          application.navigateToApp('management', {
            path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(ruleId)}`,
          });
        }}
        multiConsumerSelection={AlertConsumers.ALERTS}
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleFormRoute as default };
