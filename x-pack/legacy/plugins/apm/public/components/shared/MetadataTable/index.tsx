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
import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiText } from '@elastic/eui';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { Section as SectionType } from './sections';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../typings/es_schemas/ui/Span';
import { HeightRetainer } from '../HeightRetainer';
import { Section } from './Section';
import { history } from '../../../utils/history';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { filterSections } from './helper';

export type Item = Transaction | APMError | Span;

interface Props {
  item: Item;
  sections: SectionType[];
}

export function MetadataTable({ item, sections }: Props) {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { filter = '' } = urlParams;
  const [filteredValue, setFilteredValue] = useState(filter || '');
  const [filteredSections, setFilteredSections] = useState(
    filterSections(sections, item, filter)
  );

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim().toLowerCase();
      setFilteredValue(value);
      setFilteredSections(filterSections(sections, item, value));
      history.replace({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          filter: value
        })
      });
    },
    [sections, item, location]
  );

  const noResultFound = (filteredValue && isEmpty(filteredSections)) || false;

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
          <EuiFieldSearch
            onChange={onSearchChange}
            placeholder={i18n.translate('xpack.apm.searchInput.filter', {
              defaultMessage: 'Filter...'
            })}
            style={{
              width: 400
            }}
            isInvalid={noResultFound}
            value={filteredValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <HeightRetainer>
        {filteredSections.map(section => (
          <div key={section.key}>
            <EuiTitle size="xs">
              <h6>{section.label}</h6>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Section propData={section.data} />
            <EuiSpacer size="xl" />
          </div>
        ))}
        {noResultFound && <NoResultFound value={filteredValue} />}
      </HeightRetainer>
    </React.Fragment>
  );
}

const NoResultFound = ({ value }: { value: string }) => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.noResultFound', // todo caue: change it
          {
            defaultMessage: `No results for "{value}".`,
            values: { value }
          }
        )}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
