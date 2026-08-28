/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface RestrictTrafficToggleProps {
  isRestricted: boolean;
  isDisabled: boolean;
  onChange: (isRestricted: boolean) => void;
}

export const RestrictTrafficToggle: React.FC<RestrictTrafficToggleProps> = ({
  isRestricted,
  isDisabled,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const toggleId = useGeneratedHtmlId({ prefix: 'restrictTrafficToggle' });

  const helpText = isRestricted ? (
    <EuiText size="xs" color="subdued" data-test-subj="manageRegionsToggleHelpText">
      <FormattedMessage
        id="xpack.searchInferenceEndpoints.manageRegions.restrictTrafficHelpOn"
        defaultMessage="Limits inference traffic to the selected locations. It's recommended to review model usage prior to saving the policy. <b>Not all models are available in all locations and may affect usage.</b>"
        values={{ b: (chunks) => <strong>{chunks}</strong> }}
      />
    </EuiText>
  ) : (
    <EuiText size="xs" color="subdued" data-test-subj="manageRegionsToggleHelpText">
      {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.restrictTrafficHelpOff', {
        defaultMessage:
          'Routes traffic through any available location for best performance. New locations will automatically be allowed as they become available.',
      })}
    </EuiText>
  );

  const switchElement = (
    <EuiFormRow helpText={helpText} fullWidth>
      <EuiSwitch
        id={toggleId}
        checked={isRestricted}
        css={{ marginBottom: euiTheme.size.m }}
        onChange={(e) => onChange(e.target.checked)}
        disabled={isDisabled}
        label={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.restrictTrafficLabel', {
          defaultMessage: 'Restrict inference traffic',
        })}
        data-test-subj="manageRegionsCustomPolicyToggle"
      />
    </EuiFormRow>
  );

  if (!isRestricted) {
    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        data-test-subj="manageRegionsRestrictPanel"
      >
        {switchElement}
      </EuiPanel>
    );
  }

  return switchElement;
};
