/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyFormState } from '../types';
import type { ActionPolicyPrototypeView } from './rule_tags_prototype_toggle';
import { PolicyScopeSummary } from './policy_scope_summary';
import { RuleTagsScopeField } from './rule_tags_scope_field';

interface PolicyScopeSectionProps {
  prototypeView: ActionPolicyPrototypeView;
}

export const PolicyScopeSection = ({ prototypeView }: PolicyScopeSectionProps) => {
  const { control, setValue } = useFormContext<ActionPolicyFormState>();
  const matcher = useWatch({ control, name: 'matcher' });

  const selectedTags = useMemo(() => matcher?.tags ?? [], [matcher]);
  const expression = matcher?.expression ?? '';

  const onChangeTags = useCallback(
    (tags: string[]) => {
      const next: PolicyMatcher = {
        ...(matcher ?? {}),
        tags: tags.length > 0 ? tags : null,
      };
      setValue('matcher', next, { shouldDirty: true, shouldTouch: true });
    },
    [matcher, setValue]
  );

  const onChangeExpression = useCallback(
    (nextExpression: string) => {
      const next: PolicyMatcher = {
        ...(matcher ?? {}),
        expression: nextExpression || null,
      };
      setValue('matcher', next, { shouldDirty: true, shouldTouch: true });
    },
    [matcher, setValue]
  );

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
            defaultMessage="Define which alert episodes this policy applies to. Tags and expression conditions are combined with AND. Leave both empty to apply the policy to all episodes in the space."
          />
          <EuiSpacer size="m" />
          <PolicyScopeSummary selectedTags={selectedTags} matcher={expression} />
        </>
      }
    >
      <RuleTagsScopeField
        selectedTags={selectedTags}
        onChangeTags={onChangeTags}
        expression={expression}
        onChangeExpression={onChangeExpression}
        prototypeView={prototypeView}
      />
    </EuiDescribedFormGroup>
  );
};
