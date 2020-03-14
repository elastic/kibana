/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, chunk, get, pick, isNumber } from 'lodash/fp';
import React, { memo, useState } from 'react';

import {
  IIndexPattern,
  Filter,
  esFilters,
  FilterManager,
} from '../../../../../../../../../../src/plugins/data/public';
import { DEFAULT_TIMELINE_TITLE } from '../../../../../components/timeline/translations';
import { useKibana } from '../../../../../lib/kibana';
import { IMitreEnterpriseAttack } from '../../types';
import { FieldValueTimeline } from '../pick_timeline';
import { FormSchema } from '../../../../../shared_imports';
import { ListItems } from './types';
import {
  buildQueryBarDescription,
  buildSeverityDescription,
  buildStringArrayDescription,
  buildThreatDescription,
  buildUnorderedListArrayDescription,
  buildUrlsDescription,
} from './helpers';

interface StepRuleDescriptionProps {
  direction?: 'row' | 'column';
  data: unknown;
  indexPatterns?: IIndexPattern;
  schema: FormSchema;
}

const StepRuleDescriptionComponent: React.FC<StepRuleDescriptionProps> = ({
  data,
  direction = 'row',
  indexPatterns,
  schema,
}) => {
  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));

  const keys = Object.keys(schema);
  const listItems = keys.reduce(
    (acc: ListItems[], key: string) => [
      ...acc,
      ...buildListItems(data, pick(key, schema), filterManager, indexPatterns),
    ],
    []
  );

  if (direction === 'row') {
    return (
      <EuiFlexGroup>
        {chunk(Math.ceil(listItems.length / 2), listItems).map((chunkListItems, index) => (
          <EuiFlexItem key={`description-step-rule-${index}`}>
            <EuiDescriptionList listItems={chunkListItems} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem data-test-subj="definition" key={`description-step-rule`}>
        <EuiDescriptionList listItems={listItems} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const StepRuleDescription = memo(StepRuleDescriptionComponent);

const buildListItems = (
  data: unknown,
  schema: FormSchema,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] =>
  Object.keys(schema).reduce<ListItems[]>(
    (acc, field) => [
      ...acc,
      ...getDescriptionItem(
        field,
        get([field, 'label'], schema),
        data,
        filterManager,
        indexPatterns
      ),
    ],
    []
  );

export const addFilterStateIfNotThere = (filters: Filter[]): Filter[] => {
  return filters.map(filter => {
    if (filter.$state == null) {
      return { $state: { store: esFilters.FilterStateStore.APP_STATE }, ...filter };
    } else {
      return filter;
    }
  });
};

const getDescriptionItem = (
  field: string,
  label: string,
  data: unknown,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] => {
  if (field === 'queryBar') {
    const filters = addFilterStateIfNotThere(get('queryBar.filters', data) ?? []);
    const query = get('queryBar.query.query', data);
    const savedId = get('queryBar.saved_id', data);
    return buildQueryBarDescription({
      field,
      filters,
      filterManager,
      query,
      savedId,
      indexPatterns,
    });
  } else if (field === 'threat') {
    const threat: IMitreEnterpriseAttack[] = get(field, data).filter(
      (singleThreat: IMitreEnterpriseAttack) => singleThreat.tactic.name !== 'none'
    );
    return buildThreatDescription({ label, threat });
  } else if (field === 'references') {
    const urls: string[] = get(field, data);
    return buildUrlsDescription(label, urls);
  } else if (field === 'falsePositives') {
    const values: string[] = get(field, data);
    return buildUnorderedListArrayDescription(label, field, values);
  } else if (Array.isArray(get(field, data))) {
    const values: string[] = get(field, data);
    return buildStringArrayDescription(label, field, values);
  } else if (field === 'severity') {
    const val: string = get(field, data);
    return buildSeverityDescription(label, val);
  } else if (field === 'timeline') {
    const timeline = get(field, data) as FieldValueTimeline;
    return [
      {
        title: label,
        description: timeline.title ?? DEFAULT_TIMELINE_TITLE,
      },
    ];
  }

  const description: string = get(field, data);
  if (isNumber(description) || !isEmpty(description)) {
    return [
      {
        title: label,
        description,
      },
    ];
  }
  return [];
};
