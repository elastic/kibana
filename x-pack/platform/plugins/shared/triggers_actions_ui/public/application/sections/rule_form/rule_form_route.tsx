/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm } from '@kbn/alerts-ui-shared/src/rule_form/rule_form';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { useLocation, useParams } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';

export const RuleFormRoute = () => {
  const {
    http,
    i18n,
    theme,
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
    chrome,
    setBreadcrumbs,
  } = useKibana().services;

  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const { id, ruleTypeId } = useParams<{
    id?: string;
    ruleTypeId?: string;
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

  return (
    <IntlProvider locale="en">
      <RuleForm
        plugins={{
          http,
          i18n,
          theme,
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
        }}
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
