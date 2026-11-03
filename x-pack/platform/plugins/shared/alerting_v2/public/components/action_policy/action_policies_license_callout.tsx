/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useIsActionPoliciesLicenseValid } from '../../hooks/use_is_action_policies_license_valid';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from './labels';

/** Renders a license warning when the current license does not support action policies. */
export const ActionPoliciesLicenseCallout = () => {
  const { capabilities, getUrlForApp } = useService(CoreStart('application'));
  const isLicenseValid = useIsActionPoliciesLicenseValid();

  if (isLicenseValid) {
    return null;
  }

  const canManageLicense = Boolean(capabilities.management?.stack?.license_management);

  return (
    <>
      <KbnWarningCallout
        title={i18n.translate('xpack.alertingV2.actionPolicy.license.calloutTitle', {
          defaultMessage: 'Enterprise license required',
        })}
        text={ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE}
        actionProps={
          canManageLicense
            ? {
                primary: {
                  children: i18n.translate('xpack.alertingV2.actionPolicy.license.manageLicense', {
                    defaultMessage: 'Manage license',
                  }),
                  href: getUrlForApp('management', { path: 'stack/license_management' }),
                  'data-test-subj': 'actionPoliciesLicenseCalloutManageLicense',
                },
              }
            : undefined
        }
        data-test-subj="actionPoliciesLicenseCallout"
      />
      <EuiSpacer size="m" />
    </>
  );
};
