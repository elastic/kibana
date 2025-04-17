/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSidebar, EuiSideNav } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

export const Sidebar = ({ history }: { history: ScopedHistory }) => {
  return (
    <EuiPageSidebar>
      <EuiSideNav
        items={[
          {
            name: 'Component Sandboxes',
            id: 'component_sandboxes',
            items: [
              {
                id: 'home',
                name: 'Home',
                onClick: () => history.push('/'),
              },
              {
                id: 'rules_list',
                name: 'Rules List',
                onClick: () => history.push(`/rules_list`),
              },
              {
                id: 'rules_list_notify_badge',
                name: 'Rules List Notify Badge',
                onClick: () => history.push(`/rules_list_notify_badge`),
              },
              {
                id: 'rule_tag_badge',
                name: 'Rule Tag Badge',
                onClick: () => history.push(`/rule_tag_badge`),
              },
              {
                id: 'rule_tag_filter',
                name: 'Rule Tag Filter',
                onClick: () => history.push(`/rule_tag_filter`),
              },
              {
                id: 'rule_event_log_list',
                name: 'Run History List',
                onClick: () => history.push(`/rule_event_log_list`),
              },
              {
                id: 'global_rule_event_log_list',
                name: 'Global Run History List',
                onClick: () => history.push(`/global_rule_event_log_list`),
              },
              {
                id: 'rule_status_dropdown',
                name: 'Rule Status Dropdown',
                onClick: () => history.push(`/rule_status_dropdown`),
              },
              {
                id: 'rule_status_filter',
                name: 'Rule Status Filter',
                onClick: () => history.push(`/rule_status_filter`),
              },
              {
                id: 'alerts_table',
                name: 'Alert Table',
                onClick: () => history.push('/alerts_table'),
              },
              {
                id: 'rules_settings_link',
                name: 'Rules Settings Link',
                onClick: () => history.push('/rules_settings_link'),
              },
              {
                id: 'alerts_filters_form',
                name: 'Alerts filters form',
                onClick: () => history.push('/alerts_filters_form'),
              },
            ],
          },
          {
            name: 'Rule Form Components',
            id: 'rule-form-components',
            items: [
              {
                id: 'rule-create',
                name: 'Rule Create',
                onClick: () => history.push('/rule/create/.es-query'),
              },
              {
                id: 'rule-edit',
                name: 'Rule Edit',
                onClick: () => history.push('/rule/edit/test'),
              },
            ],
          },
          {
            name: 'Task Manager with API key',
            id: 'task-manager-with-api-key',
            items: [
              {
                id: 'task-manager-with-api-key-page',
                name: 'Task Manager with API Key',
                onClick: () => history.push('/task_manager_with_api_key'),
              },
            ],
          },
        ]}
      />
    </EuiPageSidebar>
  );
};
