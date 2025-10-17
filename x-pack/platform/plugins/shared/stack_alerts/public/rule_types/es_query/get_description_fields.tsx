/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_DETAIL_DESCRIPTION_FIELD_TYPES } from '@kbn/alerting-types/rule_detail_description_type';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) return [];

  if (rule.params.searchType === 'esQuery') {
    return [
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN](
        rule.params.index as string[]
      ),
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY](
        rule.params.esQuery as string
      ),
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      // {
      //   type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY,
      //   value: (rule.params.esqlQuery as { esql: string }).esql,
      //   description: (
      //     <CodeBlockWrapper>{(rule.params.esqlQuery as { esql: string }).esql}</CodeBlockWrapper>
      //   ),
      // },
    ];
  }

  if (rule.params.searchType === 'searchSource' && rule.params.searchConfiguration) {
    return [
      // {
      //   type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_ID,
      //   description: <span>{(rule.params.searchConfiguration as { index: string[] }).index}</span>,
      // },
      // {
      //   type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_INDEX_PATTERN,
      //   description: (
      //     <AsyncField<{
      //       result: {
      //         result: { item: { id: string; attributes: { title: string; name: string } } };
      //       };
      //     }>
      //       queryKey={['esQueryRuleDescriptionDataViewDetails']}
      //       queryFn={() =>
      //         http.post('/api/content_management/rpc/get', {
      //           body: JSON.stringify({
      //             contentTypeId: 'index-pattern',
      //             id: (rule.params.searchConfiguration as { index: string }).index,
      //             version: '1',
      //           }),
      //         })
      //       }
      //     >
      //       {(data) => <div>{data.result.result.item.attributes.title}</div>}
      //     </AsyncField>
      //   ),
      // },
      // {
      //   type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY,
      //   description: (
      //     <CodeBlockWrapper>
      //       {(rule.params.searchConfiguration as { query: { query: string } }).query.query}
      //     </CodeBlockWrapper>
      //   ),
      // },
    ];
  }

  return [];
};
