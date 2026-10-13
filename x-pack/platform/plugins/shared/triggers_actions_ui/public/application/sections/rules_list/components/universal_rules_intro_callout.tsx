/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { ALERTING_V2_RULES_BASE_PATH, ALERTING_V2_RULES_TAB_ID } from '@kbn/alerting-v2-constants';
import { canAccessAlertingV2Rules } from '@kbn/alerting-v2-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '../../../../common/lib/kibana';

export const UNIVERSAL_RULES_INTRO_CALLOUT_DISMISSED_STORAGE_KEY =
  'triggersActions.rules.universalRulesIntroCalloutDismissed' as const;

/**
 * Introduces Universal rules on the Classic rules list when both rule systems are available.
 */
export const UniversalRulesIntroCallout = () => {
  const services = useKibana().services;
  const { http, tabs, notifications } = services;
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    UNIVERSAL_RULES_INTRO_CALLOUT_DISMISSED_STORAGE_KEY,
    false
  );

  if (!canAccessAlertingV2Rules(services) || !notifications.tours.isEnabled() || isDismissed) {
    return null;
  }

  // Prefer the host Universal tab (e.g. Observability `/rules/v2`) when present;
  // fall back to Stack Management Universal rules for standalone Classic lists.
  const universalTabHref = tabs?.find((tab) => tab.id === ALERTING_V2_RULES_TAB_ID)?.href;
  const universalRulesHref = universalTabHref ?? http.basePath.prepend(ALERTING_V2_RULES_BASE_PATH);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        announceOnMount
        color="primary"
        iconType="info"
        size="s"
        data-test-subj="universalRulesIntroCallout"
        title={i18n.translate(
          'xpack.triggersActionsUI.rulesList.universalRulesIntroCallout.title',
          {
            defaultMessage: 'Introducing Universal rules',
          }
        )}
        onDismiss={() => setIsDismissed(true)}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesList.universalRulesIntroCallout.description"
          defaultMessage="There's a new way to create ES|QL-based rules. Open {universalRulesLink} to get started."
          values={{
            universalRulesLink: (
              <EuiLink
                href={universalRulesHref}
                data-test-subj="universalRulesIntroCalloutUniversalLink"
              >
                {i18n.translate(
                  'xpack.triggersActionsUI.rulesList.universalRulesIntroCallout.universalRulesLinkLabel',
                  { defaultMessage: 'Universal rules' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
