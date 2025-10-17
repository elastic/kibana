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
import type { HttpResponse, HttpSetup } from '@kbn/core/public';
import type { PrebuildFieldsMap, RuleDefinitionProps } from '../../../../types';

/* usage:
 * <AsyncField<dataType>
 *   queryKey={['react-query-key']}
 *   queryFn={async () => { // your async function }}
 * >
 *   {(data: dataType) => (
 *     // render something with data
 *   )}
 * </AsyncField>
 */
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

const IndexPattern = ({ patterns }: { patterns: string[] }) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {patterns.map((pattern) => (
        <EuiBadge key={pattern} color="hollow">
          {pattern}
        </EuiBadge>
      ))}
    </EuiFlexGroup>
  );
};

const CodeBlock = ({ children, border }: { children: React.ReactNode; border: string }) => {
  return (
    <EuiCodeBlock language="text" isCopyable overflowHeight={100} paddingSize="m" css={{ border }}>
      {children}
    </EuiCodeBlock>
  );
};

const createPrebuildFields = ({
  border,
  http,
}: {
  border: string;
  http: HttpSetup | undefined;
}): PrebuildFieldsMap => {
  return {
    [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN]: (patterns: string[]) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.indexPatternTitle', {
        defaultMessage: 'Index pattern',
      }),
      description: <IndexPattern patterns={patterns} />,
    }),
    [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY]: (query: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.customQueryTitle', {
        defaultMessage: 'Custom query',
      }),
      description: <CodeBlock border={border}>{query}</CodeBlock>,
    }),

    [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY]: (query: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.esqlQueryTitle', {
        defaultMessage: 'ES|QL query',
      }),
      description: <CodeBlock border={border}>{query}</CodeBlock>,
    }),
    [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_ID]: (id: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.dataViewIdTitle', {
        defaultMessage: 'Data view id',
      }),
      description: <span>{id}</span>,
    }),
    [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_INDEX_PATTERN]: (indexId: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.dataViewIndexPatternTitle', {
        defaultMessage: 'Data view index patterns',
      }),
      description: (
        <AsyncField<
          | {
              result: {
                result: { item: { id: string; attributes: { title: string; name: string } } };
              };
            }
          | undefined
        >
          queryKey={['esQueryRuleDescriptionDataViewDetails']}
          queryFn={() => {
            return http!.post('/api/content_management/rpc/get', {
              body: JSON.stringify({
                contentTypeId: 'index-pattern',
                id: indexId,
                version: '1',
              }),
            });
          }}
        >
          {(data) => {
            return data ? <div>{data.result.result.item.attributes.title}</div> : <div>-</div>;
          }}
        </AsyncField>
      ),
    }),
  };
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

  const getDescriptionFields = useMemo(() => {
    if (!rule || !rule.ruleTypeId || !ruleTypeRegistry.has(rule.ruleTypeId)) {
      return;
    }
    return ruleTypeRegistry.get(rule.ruleTypeId).getDescriptionFields;
  }, [rule, ruleTypeRegistry]);

  const descriptionFields = useMemo(() => {
    if (!getDescriptionFields) {
      return [];
    }

    const prebuildFields = createPrebuildFields({
      border: euiTheme.border.thin as string,
      http,
    });

    if (!prebuildFields) {
      return [];
    }

    return getDescriptionFields({ rule, prebuildFields, http });
  }, [getDescriptionFields, euiTheme.border.thin, http, rule]);

  return { descriptionFields };
};
