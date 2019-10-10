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
  EuiTitle
} from '@elastic/eui';
import React from 'react';
import { get, has, pick, isEmpty } from 'lodash';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DottedKeyValueTable } from '../DottedKeyValueTable';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { Section as SectionType } from './sections';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../typings/es_schemas/ui/Span';

interface Props {
  item: Transaction | APMError | Span;
  sections: SectionType[];
}

export function MetadataTable({ item, sections }: Props) {
  const filteredSections = sections.filter(
    ({ key, required }) => required || has(item, key)
  );
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ElasticDocsLink section="/apm/get-started" path="/metadata.html">
            <EuiText size="s">
              <EuiIcon type="help" /> How to add labels and other data
            </EuiText>
          </ElasticDocsLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {filteredSections.map(section => {
        let sectionData: Record<string, unknown> = get(item, section.key);
        if (section.properties) {
          sectionData = pick(sectionData, section.properties);
          if (isEmpty(sectionData) && !section.required) {
            return;
          }
        }
        return (
          <div key={section.key}>
            <EuiTitle size="xs">
              <h6>{section.label}</h6>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Section propData={sectionData} propKey={section.key} />
            <EuiSpacer size="xl" />
          </div>
        );
      })}
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

  return (
    <DottedKeyValueTable data={propData} parentKey={propKey} maxDepth={5} />
  );
}
