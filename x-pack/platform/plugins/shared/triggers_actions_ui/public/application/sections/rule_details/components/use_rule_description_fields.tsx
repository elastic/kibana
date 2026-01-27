/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { css } from '@emotion/react';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common/data_views/data_view';
import { useKibana } from '../../../../common/lib/kibana';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from './rule_detail_description_type';
import type { PrebuildFieldsMap, RuleDefinitionProps } from '../../../../types';

const RULE_DESCRIPTION_GET_DATA_VIEW_QUERY_KEY = 'ruleDescriptionGetDataView';

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
  queryFn: () => Promise<T>;
  children: (data: T) => React.ReactNode;
}) => {
  const { data } = useQuery<T, Error>(queryKey, queryFn, {
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
  queryFn: () => Promise<T>;
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
  if (patterns.length === 0) {
    return <span>-</span>;
  }

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="xs"
      wrap
      data-test-subj="rule-description-index-patterns"
    >
      {patterns.map((pattern) => (
        <EuiFlexItem grow={false} key={pattern}>
          <EuiBadge
            color="hollow"
            css={css`
              max-width: 180px;
            `}
          >
            <span className="eui-textTruncate">{pattern}</span>
          </EuiBadge>
        </EuiFlexItem>
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

export const createPrebuildFields = ({ border }: { border: string }): PrebuildFieldsMap => {
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
    [RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]: (dataViewIndexId: string) => {
      const { dataViews } = useKibana().services;
      return {
        title: i18n.translate('xpack.triggersActionsUI.ruleDetails.dataViewIndexPatternTitle', {
          defaultMessage: 'Data view index patterns',
        }),
        description: (
          <AsyncField<DataView>
            queryKey={[RULE_DESCRIPTION_GET_DATA_VIEW_QUERY_KEY]}
            queryFn={() => {
              return dataViews.get(dataViewIndexId);
            }}
          >
            {(dataView) => {
              if (!dataView) {
                return <div data-test-subj="description-detail-data-view-pattern-error">-</div>;
              }

              return (
                <IndexPattern
                  patterns={[dataView.getIndexPattern()]}
                  data-test-subj="description-detail-data-view-pattern"
                />
              );
            }}
          </AsyncField>
        ),
      };
    },
    [RULE_PREBUILD_DESCRIPTION_FIELDS.QUERY_FILTERS]: ({ filters, dataViewId }) => {
      const { dataViews } = useKibana().services;
      return {
        title: i18n.translate('xpack.triggersActionsUI.ruleDetails.queryFiltersTitle', {
          defaultMessage: 'Filters',
        }),
        description: (
          <AsyncField<DataView>
            queryKey={[RULE_DESCRIPTION_GET_DATA_VIEW_QUERY_KEY]}
            queryFn={() => {
              return dataViews.get(dataViewId);
            }}
          >
            {(dataView) => {
              if (!dataView) {
                return <div data-test-subj="description-detail-query-filter-error">-</div>;
              }

              return (
                <EuiFlexGroup
                  wrap
                  responsive={false}
                  gutterSize="xs"
                  data-test-subj="description-detail-query-filter"
                >
                  <FilterItems filters={filters} indexPatterns={[dataView]} readOnly />
                </EuiFlexGroup>
              );
            }}
          </AsyncField>
        ),
      };
    },
    [RULE_PREBUILD_DESCRIPTION_FIELDS.KQL_FILTERS]: (kql: string) => ({
      title: i18n.translate('xpack.triggersActionsUI.ruleDetails.kqlFiltersTitle', {
        defaultMessage: 'Filter',
      }),
      description: <CodeBlock border={border}>{kql}</CodeBlock>,
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
    });

    if (!prebuildFields) {
      return [];
    }

    return getDescriptionFields({ rule, prebuildFields });
  }, [getDescriptionFields, euiTheme.border.thin, rule]);

  return { descriptionFields };
};
