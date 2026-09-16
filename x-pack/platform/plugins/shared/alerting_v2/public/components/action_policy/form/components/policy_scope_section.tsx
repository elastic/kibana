/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ActionPolicyFormState } from '../types';
import type { ActionPolicyPrototypeView } from './rule_tags_prototype_toggle';
import { PolicyScopeSummary } from './policy_scope_summary';
import { RuleTagsScopeField } from './rule_tags_scope_field';

interface PolicyScopeSectionProps {
  selectedTags: string[];
  onChangeTags: (tags: string[]) => void;
  prototypeView: ActionPolicyPrototypeView;
}

export const PolicyScopeSection = ({
  selectedTags,
  onChangeTags,
  prototypeView,
}: PolicyScopeSectionProps) => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const matcher = useWatch({ control, name: 'matcher' });

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.matchConditions.title"
              defaultMessage="Policy scope"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <>
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.matchConditions.description"
            defaultMessage="Define which alert episodes this policy applies to. Select rule tags (joined with OR) or add a KQL match expression in advanced matching."
          />
          <EuiSpacer size="m" />
          <PolicyScopeSummary selectedTags={selectedTags} matcher={matcher} />
        </>
      }
    >
      <RuleTagsScopeField
        selectedTags={selectedTags}
        onChangeTags={onChangeTags}
        prototypeView={prototypeView}
      />
    </EuiDescribedFormGroup>
  );
};
