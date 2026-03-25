/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm, useRuleTemplate } from '@kbn/response-ops-rule-form';
import { AlertConsumers, getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { ProjectRoutingAccess, useRouteBasedCpsPickerAccess } from '@kbn/cps-utils';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { useSetBreadcrumbs } from '../../hooks/use_set_breadcrumbs';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { RuleTemplateError } from './components/rule_template_error';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

export const RuleFormRoute = () => {
  const {
    http,
    application,
    cps,
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
    ...startServices
  } = useKibana().services;
  const setBreadcrumbs = useSetBreadcrumbs();
  const { getUrlForApp } = application;

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
  const { returnPath } = location.state || {};

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

  useRouteBasedCpsPickerAccess(ProjectRoutingAccess.READONLY, { application, cps });

  const ruleTypeId = ruleTypeIdParams ?? ruleTemplate?.ruleTypeId;

  // Set breadcrumb and page title
  useEffect(() => {
    const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);
    const breadcrumbHref = getUrlForApp('rules', { path: '/' });

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
  }, [ruleTypeId, templateId, id, getUrlForApp]);

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
          history.push(returnPath || '/');
        }}
        onSubmit={(ruleId) => {
          if (id && returnPath) {
            history.push(returnPath);
          } else {
            history.push(getRulesAppDetailsRoute(ruleId));
          }
        }}
        multiConsumerSelection={AlertConsumers.ALERTS}
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleFormRoute as default };
