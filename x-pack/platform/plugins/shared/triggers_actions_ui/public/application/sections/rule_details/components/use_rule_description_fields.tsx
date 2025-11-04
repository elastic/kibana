/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiBadge, EuiCodeBlock, EuiFlexGroup, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpResponse, HttpSetup } from '@kbn/core/public';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from './rule_detail_description_type';
import type { PrebuildFieldsMap, RuleDefinitionProps } from '../../../../types';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <span data-test-subj="rule-description-field-error-boundary">-</span>;
    }
    return this.props.children;
  }
}

const AsyncContent = <T,>({
  queryKey,
  queryFn,
  children,
}: {
  queryKey: string[];
  queryFn: () => Promise<HttpResponse<T>>;
  children: (data: T) => React.ReactNode;
}) => {
  const { data } = useQuery<HttpResponse<T>, Error>(queryKey, queryFn, {
    suspense: true,
  });
  return <>{children(data as T)}</>;
};

export const AsyncField = <T,>({
  queryKey,
  queryFn,
  children,
}: {
  queryKey: string[];
  queryFn: () => Promise<HttpResponse<T>>;
  children: (data: T) => React.ReactNode;
}) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <AsyncContent queryFn={queryFn} queryKey={queryKey}>
          {children}
        </AsyncContent>
      </Suspense>
    </ErrorBoundary>
  );
};

const IndexPattern = ({ patterns }: { patterns: string[] }) => {
  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="xs"
      wrap
      data-test-subj="rule-description-index-patterns"
    >
      {patterns.map((pattern) => (
        <EuiBadge key={pattern} color="hollow">
          {pattern}
        </EuiBadge>
      ))}
    </EuiFlexGroup>
  );
};

const CodeBlock = ({ children, border }: { children: React.ReactNode; border: string }) => {
  if (!children) {
    return <span>-</span>;
  }

  return (
    <EuiCodeBlock language="text" isCopyable overflowHeight={100} paddingSize="m" css={{ border }}>
      {children}
    </EuiCodeBlock>
  );
};

export const createPrebuildFields = ({
  border,
  http,
}: {
  border: string;
  http: HttpSetup | undefined;
}): PrebuildFieldsMap => {
  return {
    [RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN]: (patterns: string[]) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.indexPatternTitle', {
        defaultMessage: 'Index pattern',
      }),
      description: <IndexPattern patterns={patterns} />,
    }),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]: (query: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.customQueryTitle', {
        defaultMessage: 'Custom query',
      }),
      description: <CodeBlock border={border}>{query}</CodeBlock>,
    }),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.ESQL_QUERY]: (query: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.esqlQueryTitle', {
        defaultMessage: 'ES|QL query',
      }),
      description: <CodeBlock border={border}>{query}</CodeBlock>,
    }),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_ID]: (id: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.dataViewIdTitle', {
        defaultMessage: 'Data view id',
      }),
      description: <span>{id}</span>,
    }),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]: (indexId: string) => ({
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
            if (!data) {
              return <div data-test-subj="description-detail-data-view-pattern-error">-</div>;
            }

            try {
              const dataViewIndexPatterns = data.result.result.item.attributes.title.split(',');

              return (
                <IndexPattern
                  patterns={dataViewIndexPatterns}
                  data-test-subj="description-detail-data-view-pattern"
                />
              );
            } catch (e) {
              return <div data-test-subj="description-detail-data-view-pattern-error">-</div>;
            }
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
