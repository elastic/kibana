/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '../../../../common/lib/kibana';

export const STANDARD_RULES_ESQL_INTRO_BANNER_DISMISSED_STORAGE_KEY =
  'triggersActions.rules.standardRulesEsqlIntroBannerDismissed' as const;

/** Placeholder until comparison / ES|QL rules docs URL is finalized. */
export const STANDARD_RULES_ESQL_INTRO_DOC_URL = '#' as const;

/**
 * Introduces ES|QL rules on the Standard rules list when both rule systems are available.
 */
export const StandardRulesEsqlIntroBanner = () => {
  const { http } = useKibana().services;
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    STANDARD_RULES_ESQL_INTRO_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (isDismissed) {
    return null;
  }

  const esqlRulesHref = http.basePath.prepend(ALERTING_V2_RULES_BASE_PATH);

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        iconType="info"
        size="s"
        data-test-subj="standardRulesEsqlIntroBanner"
        title={i18n.translate('xpack.triggersActionsUI.rulesList.esqlIntroBanner.title', {
          defaultMessage: 'Introducing ES|QL rules',
        })}
        onDismiss={() => setIsDismissed(true)}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesList.esqlIntroBanner.description"
          defaultMessage="There's a new way to create ES|QL-based rules. Open {esqlRulesLink} to get started. {learnMoreLink}"
          values={{
            esqlRulesLink: (
              <EuiLink href={esqlRulesHref} data-test-subj="standardRulesEsqlIntroBannerEsqlLink">
                {i18n.translate(
                  'xpack.triggersActionsUI.rulesList.esqlIntroBanner.esqlRulesLinkLabel',
                  { defaultMessage: 'ES|QL rules' }
                )}
              </EuiLink>
            ),
            learnMoreLink: (
              <EuiLink
                href={STANDARD_RULES_ESQL_INTRO_DOC_URL}
                target="_blank"
                external
                data-test-subj="standardRulesEsqlIntroBannerLearnMoreLink"
              >
                {i18n.translate(
                  'xpack.triggersActionsUI.rulesList.esqlIntroBanner.learnMoreLinkLabel',
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
