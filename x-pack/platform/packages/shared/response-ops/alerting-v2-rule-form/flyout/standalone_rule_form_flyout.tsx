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
import { StandaloneRuleForm } from '../form/standalone_rule_form';

export interface StandaloneRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** Initial query for the rule (only used on mount) */
  query: string;
  /** Optional default time field */
  defaultTimeField?: string;
  /** Required services */
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
}

/**
 * Pre-composed flyout with StandaloneRuleForm.
 *
 * Use this for a classic flyout experience where the user controls everything
 * from the form after initial mount. External prop changes are ignored.
 */
export const StandaloneRuleFormFlyout: React.FC<StandaloneRuleFormFlyoutProps> = ({
  push,
  onClose,
  query,
  defaultTimeField,
  services,
}) => {
  const { http, notifications, data, dataViews } = services;

  return (
    <RuleFormFlyout push={push} onClose={onClose} services={{ http, notifications }}>
      <StandaloneRuleForm
        formId=""
        onSubmit={() => {}}
        query={query}
        defaultTimeField={defaultTimeField}
        services={{ http, data, dataViews }}
      />
    </RuleFormFlyout>
  );
};
