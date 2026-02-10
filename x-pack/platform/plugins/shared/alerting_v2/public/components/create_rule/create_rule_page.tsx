/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { EuiForm, EuiPageHeader, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory, useParams } from 'react-router-dom';
import { RulesApi } from '../../services/rules_api';
import { YamlTab } from './yaml_tab';
import { FormTab } from './form_tab';

export const CreateRulePage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const http = useService(CoreStart('http'));
  const chrome = useService(CoreStart('chrome'));
  const notifications = useService(CoreStart('notifications'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;

  const [selectedTabId, setSelectedTabId] = useState<'yaml' | 'form'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveRule = useCallback(
    async (formValues: any) => {
      setIsSubmitting(true);
      if (isEditing && ruleId) {
        try {
          await rulesApi.updateRule(ruleId, formValues);
          notifications.toasts.addSuccess(
            i18n.translate('xpack.alertingV2.createRule.editSuccessToast', {
              defaultMessage: 'Rule successfully updated',
            })
          );
          history.push('/');
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate('xpack.alertingV2.createRule.editErrorToast', {
              defaultMessage: 'Error updating rule',
            }),
          });
        } finally {
          setIsSubmitting(false);
        }
      } else {
        try {
          await rulesApi.createRule(formValues);
          notifications.toasts.addSuccess(
            i18n.translate('xpack.alertingV2.createRule.createSuccessToast', {
              defaultMessage: 'Rule successfully created',
            })
          );
          history.push('/');
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate('xpack.alertingV2.createRule.createErrorToast', {
              defaultMessage: 'Error creating rule',
            }),
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [setIsSubmitting, isEditing, ruleId, rulesApi, notifications, history]
  );

  // Set breadcrumbs
  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.alertingV2.breadcrumb.home', {
          defaultMessage: 'Alerting v2',
        }),
        href: '#/',
      },
      {
        text: isEditing
          ? i18n.translate('xpack.alertingV2.breadcrumb.edit', {
              defaultMessage: 'Edit',
            })
          : i18n.translate('xpack.alertingV2.breadcrumb.create', {
              defaultMessage: 'Create',
            }),
      },
    ]);
  }, [chrome, isEditing]);

  const tabs = useMemo(
    () => [
      {
        id: 'yaml',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlTabLabel"
            defaultMessage="Use YAML"
          />
        ),
        content: (
          <YamlTab
            ruleId={ruleId}
            isEditing={isEditing}
            onCancel={() => history.push('/')}
            saveRule={saveRule}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            services={{ http, rulesApi }}
          />
        ),
      },
      {
        id: 'form',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.createRule.formTabLabel"
            defaultMessage="Use form"
          />
        ),
        content: (
          <FormTab
            ruleId={ruleId}
            isEditing={isEditing}
            onCancel={() => history.push('/')}
            saveRule={saveRule}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            services={{ http, data, dataViews, notifications, rulesApi }}
          />
        ),
      },
    ],
    [
      saveRule,
      isSubmitting,
      setIsSubmitting,
      ruleId,
      isEditing,
      history,
      http,
      rulesApi,
      data,
      dataViews,
      notifications,
    ]
  );

  return (
    <>
      <EuiPageHeader
        pageTitle={
          isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.editPageTitle"
              defaultMessage="Edit rule"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.pageTitle"
              defaultMessage="Create rule"
            />
          )
        }
      />
      <EuiSpacer size="m" />
      <EuiForm component="form" fullWidth>
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={tabs.find((tab) => tab.id === selectedTabId)}
          onTabClick={(tab) => {
            setSelectedTabId(tab.id as 'yaml' | 'form');
          }}
        />
      </EuiForm>
    </>
  );
};
