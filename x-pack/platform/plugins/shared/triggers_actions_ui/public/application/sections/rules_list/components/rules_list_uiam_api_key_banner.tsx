/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export const RulesListUiamApiKeyBanner = () => {
  return (
    <>
      <EuiCallOut
        color="primary"
        size="s"
        iconType="info"
        data-test-subj="rulesListUiamApiKeyBanner"
        title={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.uiamApiKeyBannerTitle"
            defaultMessage="UIAM API key rollout for rules"
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.uiamApiKeyBannerDescription"
            defaultMessage="We are rolling out UIAM API keys to enable support for cross-project search. This change will be applied automatically."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
