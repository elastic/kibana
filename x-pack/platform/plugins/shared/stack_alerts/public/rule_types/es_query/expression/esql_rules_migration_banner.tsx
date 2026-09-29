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
import { useTriggerUiActionServices } from '../util';

/**
 * Placeholder until the Standard vs ES|QL rules comparison doc URL is finalized
 * (rna-program#1108 / #1110).
 */
export const ES_QUERY_TO_ESQL_COMPARISON_DOC_URL = '#' as const;

/** Management path for the ES|QL rules list (Alerting v2 rules app). */
const ESQL_RULES_MANAGEMENT_PATH = '/app/management/alertingV2/rules';

/**
 * Points authors of classic ES Query rules toward the ES|QL rules experience.
 */
export const EsqlRulesMigrationBanner = () => {
  const { http } = useTriggerUiActionServices();
  const esqlRulesHref = http.basePath.prepend(ESQL_RULES_MANAGEMENT_PATH);

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        iconType="info"
        size="s"
        data-test-subj="esQueryEsqlRulesMigrationBanner"
        title={i18n.translate('xpack.stackAlerts.esQuery.ui.esqlRulesMigrationBanner.title', {
          defaultMessage: 'Looking for ES|QL rules?',
        })}
      >
        <FormattedMessage
          id="xpack.stackAlerts.esQuery.ui.esqlRulesMigrationBanner.description"
          defaultMessage="ES Query rules are part of Standard rules. Try {esqlRulesLink} for the newer ES|QL-based experience. {learnMoreLink}"
          values={{
            esqlRulesLink: (
              <EuiLink
                href={esqlRulesHref}
                data-test-subj="esQueryEsqlRulesMigrationBannerEsqlRulesLink"
              >
                {i18n.translate(
                  'xpack.stackAlerts.esQuery.ui.esqlRulesMigrationBanner.esqlRulesLinkLabel',
                  { defaultMessage: 'ES|QL rules' }
                )}
              </EuiLink>
            ),
            learnMoreLink: (
              <EuiLink
                href={ES_QUERY_TO_ESQL_COMPARISON_DOC_URL}
                target="_blank"
                external
                data-test-subj="esQueryEsqlRulesMigrationBannerLearnMoreLink"
              >
                {i18n.translate(
                  'xpack.stackAlerts.esQuery.ui.esqlRulesMigrationBanner.learnMoreLinkLabel',
                  { defaultMessage: 'Learn more' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
