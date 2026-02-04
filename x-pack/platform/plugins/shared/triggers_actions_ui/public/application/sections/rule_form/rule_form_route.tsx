/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm, useRuleTemplate } from '@kbn/response-ops-rule-form';
import { AlertConsumers, getRuleDetailsRoute, getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useLocation, useParams, useHistory } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
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
    uiActions,
    chrome,
    setBreadcrumbs,
    ...startServices
  } = useKibana().services;
  const { navigateToApp, getUrlForApp } = application;
  const useUnifiedRulesPage = getIsExperimentalFeatureEnabled('unifiedRulesPage');

  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const history = useHistory();
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
    http,
    templateId,
  });

  const ruleTypeId = ruleTypeIdParams ?? ruleTemplate?.ruleTypeId;

  // Set breadcrumb and page title
  useEffect(() => {
    const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);
    const breadcrumbHref = useUnifiedRulesPage
      ? getUrlForApp('rules', { path: '/' })
      : getUrlForApp('management', { path: 'insightsAndAlerting/triggersActions/rules' });

    const rulesBreadcrumbWithAppPath = {
      ...rulesBreadcrumb,
      href: breadcrumbHref,
    };

    if (id) {
      setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('editRule')]);
      chrome.docTitle.change(getCurrentDocTitle('editRule'));
    }
    if (ruleTypeId || templateId) {
      setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('createRule')]);
      chrome.docTitle.change(getCurrentDocTitle('createRule'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeId, templateId, id, getUrlForApp, useUnifiedRulesPage]);

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
          uiActions,
          ...startServices,
        }}
        initialValues={ruleTemplate}
        id={id}
        ruleTypeId={ruleTypeId}
        onCancel={() => {
          if (useUnifiedRulesPage) {
            history.push(returnPath || '/');
          } else if (returnApp && returnPath) {
            navigateToApp(returnApp, { path: returnPath });
          } else {
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/rules`,
            });
          }
        }}
        onSubmit={(ruleId) => {
          if (useUnifiedRulesPage) {
            if (id && returnPath) {
              history.push(returnPath);
            } else {
              history.push(getRulesAppDetailsRoute(ruleId));
            }
          } else if (returnApp && returnPath) {
            navigateToApp(returnApp, { path: returnPath });
          } else {
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(ruleId)}`,
            });
          }
        }}
        multiConsumerSelection={AlertConsumers.ALERTS}
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleFormRoute as default };
