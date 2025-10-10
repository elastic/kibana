/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiBadge, EuiCodeBlock, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { RULE_DETAIL_DESCRIPTION_FIELD_TYPES } from '@kbn/alerting-types/rule_detail_description_type';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpResponse } from '@kbn/core/public';
import type { RuleDefinitionProps, RuleDescriptionFieldWrappers } from '../../../../types';

const translatedRuleDescriptionTypeTitles = {
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY]: i18n.translate(
    'xpack.triggersActionsUI.ruleDetails.customQueryTitle',
    {
      defaultMessage: 'Custom query',
    }
  ),
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN]: i18n.translate(
    'xpack.triggersActionsUI.ruleDetails.indexPatternTitle',
    {
      defaultMessage: 'Index pattern',
    }
  ),
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY]: i18n.translate(
    'xpack.triggersActionsUI.ruleDetails.esqlQueryTitle',
    {
      defaultMessage: 'ES|QL query',
    }
  ),
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_ID]: i18n.translate(
    'xpack.triggersActionsUI.ruleDetails.dataViewIdTitle',
    {
      defaultMessage: 'Data view id',
    }
  ),
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_INDEX_PATTERN]: i18n.translate(
    'xpack.triggersActionsUI.ruleDetails.dataViewIndexPatternTitle',
    {
      defaultMessage: 'Data view index patterns',
    }
  ),
};

const AsyncField = <T,>({
  queryKey,
  queryFn,
  children,
}: {
  queryKey: string[];
  queryFn: () => Promise<HttpResponse<T>>;
  children: (data: T) => React.ReactNode;
}) => {
  const AsyncContent = () => {
    const { data } = useQuery<HttpResponse<T>, Error>(queryKey, queryFn, { suspense: true });
    return <>{children(data as T)}</>;
  };

  return (
    <Suspense fallback="Loading...">
      <AsyncContent />
    </Suspense>
  );
};

export const useRuleDescriptionFields = ({
  rule,
  ruleTypeRegistry,
}: {
  rule: RuleDefinitionProps['rule'];
  ruleTypeRegistry: RuleDefinitionProps['ruleTypeRegistry'];
}) => {
  const { http } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  // Gets the rule type specific function to get the description fields
  const getDescriptionFields = useMemo(() => {
    if (!rule || !rule.ruleTypeId || !ruleTypeRegistry.has(rule.ruleTypeId)) {
      return;
    }
    return ruleTypeRegistry.get(rule.ruleTypeId).getDescriptionFields;
  }, [rule, ruleTypeRegistry]);

  // This are the building blocks we can use to compose the rule description fields
  // Allows us to have a consistent UI across rule types
  const descriptionFieldWrappers = useMemo<RuleDescriptionFieldWrappers>(() => {
    return {
      codeBlock: ({ children }: { children: React.ReactNode }) => {
        return (
          <EuiCodeBlock
            language="text"
            isCopyable
            overflowHeight={100}
            paddingSize="m"
            css={{ border: euiTheme.border.thin }}
          >
            {children}
          </EuiCodeBlock>
        );
      },
      indexPattern: ({ children }: { children: React.ReactNode }) => {
        return (
          <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
            {children}
          </EuiFlexGroup>
        );
      },
      indexPatternItem: ({ children }: { children: React.ReactNode }) => {
        return <EuiBadge color="hollow">{children}</EuiBadge>;
      },
      asyncField: AsyncField,
    };
  }, [euiTheme.border.thin]);

  const descriptionFields = useMemo(() => {
    if (!getDescriptionFields) {
      return [];
    }

    // Calls the rule type specific function to get the description fields
    // passing by the rule and the bulding blocks to compose the fields
    return getDescriptionFields({ rule, fieldWrappers: descriptionFieldWrappers, http }).map(
      ({ type, description }) => {
        // Map the type to a translated title, we could add more fields or whatever is needed
        // depending on the type
        return { title: translatedRuleDescriptionTypeTitles[type], description };
      }
    );
  }, [descriptionFieldWrappers, getDescriptionFields, rule, http]);

  return { descriptionFields };
};
