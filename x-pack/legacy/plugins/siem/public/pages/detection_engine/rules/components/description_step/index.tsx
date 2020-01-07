/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiTextArea } from '@elastic/eui';
import { isEmpty, chunk, get, pick } from 'lodash/fp';
import React, { memo, useState } from 'react';
import styled from 'styled-components';

import {
  IIndexPattern,
  esFilters,
  FilterManager,
  Query,
} from '../../../../../../../../../../src/plugins/data/public';
import { DEFAULT_TIMELINE_TITLE } from '../../../../../components/timeline/search_super_select/translations';
import { useKibana } from '../../../../../lib/kibana';
import { IMitreEnterpriseAttack } from '../../types';
import { FieldValueTimeline } from '../pick_timeline';
import { FormSchema } from '../shared_imports';
import { ListItems } from './types';
import {
  buildQueryBarDescription,
  buildSeverityDescription,
  buildStringArrayDescription,
  buildThreatsDescription,
  buildUrlsDescription,
} from './helpers';

interface StepRuleDescriptionProps {
  direction?: 'row' | 'column';
  data: unknown;
  indexPatterns?: IIndexPattern;
  schema: FormSchema;
}

const EuiFlexItemWidth = styled(EuiFlexItem)<{ direction: string }>`
  ${props => (props.direction === 'row' ? 'width : 50%;' : 'width: 100%;')};
`;

const MyEuiTextArea = styled(EuiTextArea)`
  max-width: 100%;
  height: 80px;
`;

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
  return (
    <EuiFlexGroup gutterSize="none" direction={direction} justifyContent="spaceAround">
      {chunk(Math.ceil(listItems.length / 2), listItems).map((chunckListItems, index) => (
        <EuiFlexItemWidth direction={direction} key={`description-step-rule-${index}`} grow={false}>
          <EuiDescriptionList listItems={chunckListItems} />
        </EuiFlexItemWidth>
      ))}
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

const getDescriptionItem = (
  field: string,
  label: string,
  value: unknown,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] => {
  if (field === 'queryBar') {
    const filters = get('queryBar.filters', value) as esFilters.Filter[];
    const query = get('queryBar.query', value) as Query;
    const savedId = get('queryBar.saved_id', value);
    return buildQueryBarDescription({
      field,
      filters,
      filterManager,
      query,
      savedId,
      indexPatterns,
    });
  } else if (field === 'threats') {
    const threats: IMitreEnterpriseAttack[] = get(field, value).filter(
      (threat: IMitreEnterpriseAttack) => threat.tactic.name !== 'none'
    );
    return buildThreatsDescription({ label, threats });
  } else if (field === 'description') {
    return [
      {
        title: label,
        description: <MyEuiTextArea value={get(field, value)} readOnly={true} />,
      },
    ];
  } else if (field === 'references') {
    const urls: string[] = get(field, value);
    return buildUrlsDescription(label, urls);
  } else if (Array.isArray(get(field, value))) {
    const values: string[] = get(field, value);
    return buildStringArrayDescription(label, field, values);
  } else if (field === 'severity') {
    const val: string = get(field, value);
    return buildSeverityDescription(label, val);
  } else if (field === 'timeline') {
    const timeline = get(field, value) as FieldValueTimeline;
    return [
      {
        title: label,
        description: timeline.title ?? DEFAULT_TIMELINE_TITLE,
      },
    ];
  }
  const description: string = get(field, value);
  if (!isEmpty(description)) {
    return [
      {
        title: label,
        description,
      },
    ];
  }
  return [];
};
