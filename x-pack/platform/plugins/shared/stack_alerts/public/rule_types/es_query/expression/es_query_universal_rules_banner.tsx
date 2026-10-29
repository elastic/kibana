/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERTING_V2_RULES_TAB_ID } from '@kbn/alerting-v2-constants';
import { canAccessAlertingV2Rules, isAlertingV2AvailableInSolution } from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';
import { useTriggerUiActionServices } from '../util';

const BANNER_TITLE = i18n.translate('xpack.stackAlerts.esQuery.ui.universalRulesBanner.title', {
  defaultMessage: 'Looking for ES|QL?',
});

const UNIVERSAL_RULES_LINK_LABEL = i18n.translate(
  'xpack.stackAlerts.esQuery.ui.universalRulesBanner.universalRulesLinkLabel',
  { defaultMessage: 'Universal rules' }
);

export const EsQueryUniversalRulesBanner = () => {
  const services = useTriggerUiActionServices();
  const { application, tabs } = services;

  if (
    !canAccessAlertingV2Rules(services) ||
    !isAlertingV2AvailableInSolution(services.chrome.getActiveSolutionNavId())
  ) {
    return null;
  }

  // Classic layouts omit the Universal tab. The rules page is the Observability Alerting mount.
  const href =
    tabs?.find((tab) => tab.id === ALERTING_V2_RULES_TAB_ID)?.href ??
    application.getUrlForApp(OBSERVABILITY_ALERTING_APP_ID, {
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
    });

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={BANNER_TITLE}
        iconType="info"
        size="s"
        data-test-subj="esQueryUniversalRulesBanner"
      >
        <p>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.universalRulesBanner.body"
            defaultMessage="Try {universalRulesLink} for the newer ES|QL-based experience with more control over your alert data."
            values={{
              universalRulesLink: (
                <EuiLink
                  href={href}
                  onClick={(event: React.MouseEvent) => {
                    event.preventDefault();
                    application.navigateToUrl(href);
                  }}
                  data-test-subj="esQueryUniversalRulesBannerLink"
                >
                  {UNIVERSAL_RULES_LINK_LABEL}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
