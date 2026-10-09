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
import { ALERTING_V2_RULES_BASE_PATH, ALERTING_V2_RULES_TAB_ID } from '@kbn/alerting-v2-constants';
import { canAccessAlertingV2Rules } from '@kbn/alerting-v2-utils';
import { useTriggerUiActionServices } from '../util';

const BANNER_TITLE = i18n.translate('xpack.stackAlerts.esQuery.ui.esqlRulesBanner.title', {
  defaultMessage: 'Looking for Universal rules?',
});

const UNIVERSAL_RULES_LINK_LABEL = i18n.translate(
  'xpack.stackAlerts.esQuery.ui.esqlRulesBanner.universalRulesLinkLabel',
  { defaultMessage: 'Universal rules' }
);

export const EsQueryEsqlRulesBanner = () => {
  const services = useTriggerUiActionServices();
  const { application, http, tabs } = services;

  if (!canAccessAlertingV2Rules(services)) {
    return null;
  }

  const href =
    tabs?.find((tab) => tab.id === ALERTING_V2_RULES_TAB_ID)?.href ??
    http.basePath.prepend(ALERTING_V2_RULES_BASE_PATH);

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={BANNER_TITLE}
        iconType="sparkles"
        data-test-subj="esQueryEsqlRulesBanner"
      >
        <p>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.esqlRulesBanner.body"
            defaultMessage="ES Query rules are part of Classic rules. Try {universalRulesLink} for the newer ES|QL-based experience."
            values={{
              universalRulesLink: (
                <EuiLink
                  href={href}
                  onClick={(event: React.MouseEvent) => {
                    event.preventDefault();
                    application.navigateToUrl(href);
                  }}
                  data-test-subj="esQueryEsqlRulesBannerLink"
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
