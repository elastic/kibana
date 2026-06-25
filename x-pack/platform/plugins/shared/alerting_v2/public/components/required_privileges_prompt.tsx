/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertingV2RequiredPrivilege } from '../lib/required_privileges';

export interface RequiredPrivilegesPromptProps {
  /** Human-readable name of the page the user attempted to view, e.g. "Rules". */
  pageName: string;
  /** Privileges the user is missing, shown so they know exactly what to request. */
  requiredPrivileges: readonly AlertingV2RequiredPrivilege[];
}

const PRIVILEGE_LABELS: Record<AlertingV2RequiredPrivilege['privilege'], string> = {
  read: i18n.translate('xpack.alertingV2.requiredPrivileges.readPrivilegeLabel', {
    defaultMessage: 'Read',
  }),
  all: i18n.translate('xpack.alertingV2.requiredPrivileges.allPrivilegeLabel', {
    defaultMessage: 'All',
  }),
};

/**
 * Full-page interstitial shown when a user navigates to an alerting_v2
 * management page without the required feature privileges. Follows the
 * standard Kibana "Privileges required" empty-prompt pattern and lists the
 * concrete feature privileges (and the capabilities they grant) the user needs.
 */
export const RequiredPrivilegesPrompt = ({
  pageName,
  requiredPrivileges,
}: RequiredPrivilegesPromptProps) => (
  <EuiEmptyPrompt
    data-test-subj="alertingV2RequiredPrivilegesPrompt"
    iconType="lock"
    color="subdued"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.requiredPrivileges.title"
          defaultMessage="Privileges required"
        />
      </h2>
    }
    body={
      <>
        <EuiText size="m">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.requiredPrivileges.body"
              defaultMessage="To view {pageName}, you need the following {count, plural, one {privilege} other {privileges}}. Contact your administrator to request access."
              values={{ pageName: <strong>{pageName}</strong>, count: requiredPrivileges.length }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" textAlign="left">
          <ul data-test-subj="alertingV2RequiredPrivilegesList">
            {requiredPrivileges.map(({ featureId, featureName, privilege, capability }) => (
              <li key={featureId} data-test-subj={`alertingV2RequiredPrivilege-${featureId}`}>
                <FormattedMessage
                  id="xpack.alertingV2.requiredPrivileges.privilegeItem"
                  defaultMessage="{featureName}: {privilege} — grants the {capability} capability"
                  values={{
                    featureName: <strong>{featureName}</strong>,
                    privilege: <strong>{PRIVILEGE_LABELS[privilege]}</strong>,
                    capability: <EuiCode>{capability}</EuiCode>,
                  }}
                />
              </li>
            ))}
          </ul>
        </EuiText>
      </>
    }
  />
);
