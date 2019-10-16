/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  EuiFieldSearch
} from '@elastic/eui';
import React from 'react';
import { get, pick, isEmpty } from 'lodash';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DottedKeyValueTable, pathify } from '../DottedKeyValueTable';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { Section as SectionType } from './sections';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../typings/es_schemas/ui/Span';

type Item = Transaction | APMError | Span;

interface Props {
  item: Item;
  sections: SectionType[];
}

const filterSections = (sections: SectionType[], item: Item) =>
  sections
    .map(section => {
      const sectionData: Record<string, unknown> = get(item, section.key);
      let data = section.properties
        ? pick(sectionData, section.properties)
        : sectionData;

      if (!isEmpty(data)) {
        data = pathify(data, { maxDepth: 5, parentKey: section.key });
      }
      return { ...section, data };
    })
    .filter(({ required, data }) => required || !isEmpty(data));

export function MetadataTable({ item, sections }: Props) {
  const filteredSections = filterSections(sections, item);

  const onSearchChange = () => {};
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <ElasticDocsLink section="/apm/get-started" path="/metadata.html">
            <EuiText size="s">
              <EuiIcon type="help" /> How to add labels and other data
            </EuiText>
          </ElasticDocsLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldSearch onChange={onSearchChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {filteredSections.map(section => (
        <div key={section.key}>
          <EuiTitle size="xs">
            <h6>{section.label}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <Section propData={section.data} propKey={section.key} />
          <EuiSpacer size="xl" />
        </div>
      ))}
    </React.Fragment>
  );
}

function Section({
  propData = {},
  propKey
}: {
  propData?: Record<string, unknown>;
  propKey?: string;
}) {
  if (isEmpty(propData)) {
    return (
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
          { defaultMessage: 'No data available' }
        )}
      </EuiText>
    );
  }
  return <DottedKeyValueTable data={propData} skipPathify />;
}
