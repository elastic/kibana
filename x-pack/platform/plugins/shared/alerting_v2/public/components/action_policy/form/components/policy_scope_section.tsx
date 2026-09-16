/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchRuleEventFields } from '../../../../hooks/use_fetch_rule_event_fields';
import {
  parseRuleTagsFromMatcher,
  mergeRuleTagsIntoMatcher,
  stripRuleTagsFromMatcher,
} from '../matcher_quick_filter_utils';
import type { ActionPolicyFormState } from '../types';
import { MatcherInput } from './matcher_input';
import { RuleTagsMatcherInput } from './rule_tags_matcher_input';

const optionalLabel = (
  <EuiText color="subdued" size="xs">
    {i18n.translate('xpack.alertingV2.actionPolicy.form.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);

const getPolicyScopeSummary = (matcher: string): string => {
  const tags = parseRuleTagsFromMatcher(matcher);
  const advancedMatcher = stripRuleTagsFromMatcher(matcher);

  if (tags.length === 0 && !advancedMatcher) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.summary.allEpisodes', {
      defaultMessage: 'Applies to all episodes in the space.',
    });
  }

  if (tags.length > 0 && !advancedMatcher) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.summary.tagsOnly', {
      defaultMessage:
        'Applies to alerts from rules with any of these tags: {tags}.',
      values: { tags: tags.join(', ') },
    });
  }

  if (tags.length === 0 && advancedMatcher) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.summary.advancedOnly', {
      defaultMessage: 'Applies to episodes that match the advanced conditions.',
    });
  }

  return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.summary.tagsAndAdvanced', {
    defaultMessage:
      'Applies to alerts from rules with any of these tags ({tags}) that also match the advanced conditions.',
    values: { tags: tags.join(', ') },
  });
};

/**
 * Policy scope: primary rule-tag picker (OR semantics, stored as `rule.tags` in the
 * matcher) plus optional Advanced matching KQL accordion.
 */
export const PolicyScopeSection = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const matcher = useWatch({ control, name: 'matcher' }) ?? '';
  const { data: dataFieldNames } = useFetchRuleEventFields(matcher);
  const accordionId = useGeneratedHtmlId({ prefix: 'actionPolicyAdvancedMatching' });
  const summary = useMemo(() => getPolicyScopeSummary(matcher), [matcher]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.policyScope.title"
            defaultMessage="Policy scope"
          />
        </h3>
      }
      description={
        <EuiText size="s" color="subdued" data-test-subj="policyScopeSummary">
          <p>{summary}</p>
        </EuiText>
      }
    >
      <Controller
        name="matcher"
        control={control}
        render={({ field }) => {
          const tags = parseRuleTagsFromMatcher(field.value);
          const advancedValue = stripRuleTagsFromMatcher(field.value);

          return (
            <>
              <RuleTagsMatcherInput
                matcher={field.value}
                onChange={field.onChange}
                showRecommendedGroups
              />
              <EuiSpacer size="m" />
              <EuiAccordion
                id={accordionId}
                buttonContent={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.policyScope.advancedMatching',
                  { defaultMessage: 'Advanced matching' }
                )}
                paddingSize="m"
                initialIsOpen={advancedValue.length > 0}
                data-test-subj="policyScopeAdvancedMatching"
              >
                <EuiFormRow
                  label={i18n.translate('xpack.alertingV2.actionPolicy.form.matcher', {
                    defaultMessage: 'Match conditions',
                  })}
                  labelAppend={optionalLabel}
                  helpText={i18n.translate(
                    'xpack.alertingV2.actionPolicy.form.policyScope.advancedMatchingHelp',
                    {
                      defaultMessage:
                        'Optional KQL for additional episode filters. Leave empty to match all episodes for the selected rule tags (or all episodes in the space when no tags are selected).',
                    }
                  )}
                  fullWidth
                >
                  <MatcherInput
                    value={advancedValue}
                    onChange={(nextAdvanced) => {
                      field.onChange(mergeRuleTagsIntoMatcher(nextAdvanced, tags));
                    }}
                    fullWidth
                    data-test-subj="matcherInput"
                    dataFieldNames={dataFieldNames}
                    placeholder={i18n.translate(
                      'xpack.alertingV2.actionPolicy.form.matcher.placeholder',
                      {
                        defaultMessage:
                          'e.g. data.host.name : "my-host.com" and rule.id : "uuid"',
                      }
                    )}
                  />
                </EuiFormRow>
              </EuiAccordion>
            </>
          );
        }}
      />
    </EuiDescribedFormGroup>
  );
};
