/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups';
import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';
import { kibanaSampleDataLogsSignificantTermsBase } from '@kbn/aiops-test-utils/kibana_sample_data_logs/significant_terms';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

import { getGroupTableItems } from './get_group_table_items';
import { getTableItemAsKQL } from './get_table_item_as_kql';

const kibanaSampleDataLogsSignificantTerms: SignificantItem[] =
  kibanaSampleDataLogsSignificantTermsBase.map((d) => ({
    ...d,
    key: `${d.fieldName}:${d.fieldValue}`,
    type: 'keyword',
    doc_count: 1981,
    bg_count: 553,
    total_doc_count: 4669,
    total_bg_count: 1975,
    score: 47.38899434932384,
    normalizedScore: 0.8328439168064725,
    pValue: +d.pValue,
  }));

const kibanaSampleDataLogsGroups: SignificantItemGroup[] = [
  {
    id: 'the-group-id',
    group: kibanaSampleDataLogsSignificantTermsBase.map((d) => ({
      ...d,
      key: `${d.fieldName}:${d.fieldValue}`,
      type: 'keyword',
      docCount: 1981,
      pValue: +d.pValue,
    })),
    docCount: 792,
    pValue: 0.00974308761016614,
  },
];

describe('getTableItemAsKQL', () => {
  it('returns a KQL syntax for a significant item', () => {
    expect(getTableItemAsKQL(significantTerms[0])).toBe('user:"Peter"');
    expect(getTableItemAsKQL(significantTerms[1])).toBe('response_code:"500"');
    expect(getTableItemAsKQL(significantTerms[2])).toBe('url:"home.php"');
    expect(getTableItemAsKQL(significantTerms[3])).toBe('url:"login.php"');

    expect(getTableItemAsKQL(kibanaSampleDataLogsSignificantTerms[0])).toBe(
      'agent.keyword:"Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24"'
    );
  });

  it('returns a KQL syntax for a group of significant items for the artificial logs dataset', () => {
    const groupTableItems = getGroupTableItems(finalSignificantItemGroups);
    expect(getTableItemAsKQL(groupTableItems[0])).toBe('response_code:"500" AND url:"home.php"');
    expect(getTableItemAsKQL(groupTableItems[1])).toBe('url:"login.php" AND response_code:"500"');
    expect(getTableItemAsKQL(groupTableItems[2])).toBe('user:"Peter" AND url:"home.php"');
  });

  it('returns a KQL syntax for a group of significant items for the Kibana logs dataset', () => {
    const groupTableItems = getGroupTableItems(kibanaSampleDataLogsGroups);
    expect(getTableItemAsKQL(groupTableItems[0])).toBe(
      'agent.keyword:"Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24" AND clientip:"30.156.16.164" AND extension.keyword:"" AND geo.dest:"IN" AND geo.srcdest:"US:IN" AND host.keyword:"elastic-elastic-elastic.org" AND ip:"30.156.16.163" AND machine.os.keyword:"win xp" AND referer:"http://www.elastic-elastic-elastic.com/success/timothy-l-kopra" AND response.keyword:"404"'
    );
  });
});
