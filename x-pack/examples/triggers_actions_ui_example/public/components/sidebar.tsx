/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiPageSidebar, EuiSideNav } from '@elastic/eui';

export const Sidebar = () => {
  const history = useHistory();
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
                id: 'alerts table',
                name: 'Alert Table',
                onClick: () => history.push('/alerts_table'),
              },
              {
                id: 'rules settings link',
                name: 'Rules Settings Link',
                onClick: () => history.push('/rules_settings_link'),
              },
            ],
          },
          {
            name: 'Rule Form Components',
            id: 'rule-form-components',
            items: [
              {
                id: 'rule-definition',
                name: 'Rule Definition',
                onClick: () => history.push('/rule_definition'),
              },
            ],
          },
        ]}
      />
    </EuiPageSidebar>
  );
};
