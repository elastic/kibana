/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface RestrictTrafficToggleProps {
  isRestricted: boolean;
  isDisabled: boolean;
  onChange: (isRestricted: boolean) => void;
}

const switchStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-bottom: ${euiTheme.size.xs};
`;

export const RestrictTrafficToggle: React.FC<RestrictTrafficToggleProps> = ({
  isRestricted,
  isDisabled,
  onChange,
}) => {
  const toggleId = useGeneratedHtmlId({ prefix: 'restrictTrafficToggle' });

  const helpText = (
    <EuiText size="xs" color="subdued" data-test-subj="manageRegionsToggleHelpText">
      <FormattedMessage
        id="xpack.searchInferenceEndpoints.manageRegions.restrictTrafficHelpOn"
        defaultMessage="Limits inference traffic to the selected locations."
        values={{ b: (chunks) => <strong>{chunks}</strong> }}
      />
    </EuiText>
  );

  const switchElement = (
    <EuiFormRow helpText={isRestricted ? helpText : undefined} fullWidth>
      <EuiSwitch
        id={toggleId}
        checked={isRestricted}
        onChange={(e) => onChange(e.target.checked)}
        disabled={isDisabled}
        label={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.restrictTrafficLabel', {
          defaultMessage: 'Use custom region policy',
        })}
        data-test-subj="manageRegionsCustomPolicyToggle"
        css={isRestricted ? switchStyles : { marginBottom: 0 }}
      />
    </EuiFormRow>
  );

  return switchElement;
};
