/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm } from '@kbn/response-ops-rule-form';
import { getCreateRuleRoute, getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
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

  const history = useHistory();
  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const {
    id,
    ruleTypeId,
    templateId: templateIdParams,
  } = useParams<{
    id?: string;
    ruleTypeId?: string;
    templateId?: string;
  }>();
  const { returnApp, returnPath } = location.state || {};

  // Set breadcrumb and page title
  useEffect(() => {
    if (id) {
      setBreadcrumbs([
        getAlertingSectionBreadcrumb('rules', true),
        getAlertingSectionBreadcrumb('editRule'),
      ]);
      chrome.docTitle.change(getCurrentDocTitle('editRule'));
    }
    if (ruleTypeId) {
      setBreadcrumbs([
        getAlertingSectionBreadcrumb('rules', true),
        getAlertingSectionBreadcrumb('createRule'),
      ]);
      chrome.docTitle.change(getCurrentDocTitle('createRule'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchParams] = useSearchParams();
  const templateId = templateIdParams ?? searchParams.get('fromTemplate') ?? undefined;

  const {
    data: ruleTemplate,
    error: ruleTemplateError,
    isLoading: isLoadingRuleTemplate,
    isError: isErrorRuleTemplate,
  } = useRuleTemplate({
    templateId,
    enabled: !!templateId,
  });

  useEffect(() => {
    if (ruleTemplate && ruleTypeId !== ruleTemplate.ruleTypeId) {
      application.navigateToApp('management', {
        path: `insightsAndAlerting/triggersActions/${getCreateRuleRoute(
          ruleTemplate.ruleTypeId
        )}?fromTemplate=${templateId}`,
      });
    }
  }, [history, ruleTypeId, ruleTemplate, templateId, application]);

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
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleFormRoute as default };
