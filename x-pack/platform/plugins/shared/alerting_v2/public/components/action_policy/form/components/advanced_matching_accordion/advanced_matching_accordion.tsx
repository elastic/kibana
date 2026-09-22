/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFormRow, useGeneratedHtmlId } from '@elastic/eui';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MatcherInput } from '../matcher_input';
import { optionalLabel } from '../optional_label';

interface AdvancedMatchingAccordionProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
  dataFieldNames?: string[];
}

export const AdvancedMatchingAccordion = ({
  matcher,
  onChange,
  dataFieldNames,
}: AdvancedMatchingAccordionProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'advancedMatchingAccordion' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonProps={{ 'data-test-subj': 'advancedMatchingAccordionToggle' }}
      buttonContent={
        <strong>
          {i18n.translate(
            'xpack.alertingV2.actionPolicy.form.policyScope.advancedMatching.buttonContent',
            { defaultMessage: 'Advanced matching' }
          )}
        </strong>
      }
      initialIsOpen={!!matcher?.expression?.trim()}
      paddingSize="s"
    >
      <EuiFormRow
        label={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.advancedMatching.label',
          { defaultMessage: 'Match conditions' }
        )}
        labelAppend={optionalLabel}
        fullWidth
      >
        <MatcherInput
          value={matcher?.expression ?? ''}
          onChange={(expr) => onChange({ ...matcher, expression: expr || null })}
          fullWidth
          data-test-subj="matcherInput"
          dataFieldNames={dataFieldNames}
          placeholder={i18n.translate('xpack.alertingV2.actionPolicy.form.matcher.placeholder', {
            defaultMessage: 'e.g. severity : "critical"',
          })}
        />
      </EuiFormRow>
    </EuiAccordion>
  );
};
