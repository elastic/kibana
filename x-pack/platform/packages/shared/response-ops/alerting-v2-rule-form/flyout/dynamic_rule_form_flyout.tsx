/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { RuleFormFlyout } from './rule_form_flyout';
import { DynamicRuleForm } from '../form/dynamic_rule_form';

export interface DynamicRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** The query that drives form values - changes will sync to form state */
  query: string;
  /** Optional default time field */
  defaultTimeField?: string;
  /** Whether the query has validation errors from the parent (e.g., Discover) */
  isQueryInvalid?: boolean;
  /** Required services */
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
}

/**
 * Pre-composed flyout with DynamicRuleForm.
 *
 * Use this for Discover integration where the form needs to react to external
 * query changes while preserving user-modified fields.
 */
export const DynamicRuleFormFlyout: React.FC<DynamicRuleFormFlyoutProps> = ({
  push,
  onClose,
  query,
  defaultTimeField,
  isQueryInvalid,
  services,
}) => {
  const { http, notifications, data, dataViews } = services;

  return (
    <RuleFormFlyout push={push} onClose={onClose} services={{ http, notifications }}>
      <DynamicRuleForm
        formId=""
        onSubmit={() => {}}
        query={query}
        defaultTimeField={defaultTimeField}
        isQueryInvalid={isQueryInvalid}
        services={{ http, data, dataViews }}
      />
    </RuleFormFlyout>
  );
};
