/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { MAX_CONDITION_LENGTH } from './integration_settings';

export interface ConditionFieldProps {
  value: string;
  onChange: (condition: string) => void;
  error?: string;
}

/**
 * The agent condition every policy of the onboarding gets, as Fleet's Add integration offers it.
 * Its error shows at once: the field is empty until edited, and the advanced options open over it.
 */
export function ConditionField({ value, onChange, error }: ConditionFieldProps) {
  const { services } = useKibana<CoreStart>();
  const learnMoreHref = services.docLinks?.links.fleet.elasticAgentInputConditions;

  return (
    <EuiFormRow
      fullWidth
      display="rowCompressed"
      label={
        <>
          {i18n.translate('xpack.ingestHub.integrationSettings.advanced.condition.label', {
            defaultMessage: 'Condition',
          })}{' '}
          <EuiIconTip
            type="info"
            color="subdued"
            content={i18n.translate(
              'xpack.ingestHub.integrationSettings.advanced.condition.tooltip',
              { defaultMessage: 'Only collect data when this condition is met.' }
            )}
          />
        </>
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.ingestHub.integrationSettings.advanced.condition.optional', {
            defaultMessage: 'Optional',
          })}
        </EuiText>
      }
      helpText={
        learnMoreHref ? (
          <EuiLink href={learnMoreHref} target="_blank" external>
            {i18n.translate('xpack.ingestHub.integrationSettings.advanced.condition.learnMore', {
              defaultMessage: 'Learn more about conditions',
            })}
          </EuiLink>
        ) : undefined
      }
      isInvalid={!!error}
      error={error}
    >
      <EuiFieldText
        fullWidth
        compressed
        value={value}
        maxLength={MAX_CONDITION_LENGTH + 1}
        onChange={(e) => onChange(e.target.value)}
        isInvalid={!!error}
        data-test-subj="sharedSettingsCondition"
      />
    </EuiFormRow>
  );
}
