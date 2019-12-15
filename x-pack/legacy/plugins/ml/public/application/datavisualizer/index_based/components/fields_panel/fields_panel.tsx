/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiCheckbox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import { FieldDataCard } from '../field_data_card';
import { FieldTypesSelect } from '../field_types_select';
import { FieldVisConfig } from '../../common';

interface Props {
  title: string;
  totalFieldCount: number;
  populatedFieldCount: number;
  showAllFields: boolean;
  setShowAllFields(b: boolean): void;
  fieldTypes: ML_JOB_FIELD_TYPES[];
  showFieldType: ML_JOB_FIELD_TYPES | '*';
  setShowFieldType?(t: ML_JOB_FIELD_TYPES | '*'): void;
  fieldSearchBarQuery?: string;
  setFieldSearchBarQuery(s: string): void;
  fieldVisConfigs: FieldVisConfig[];
}

interface SearchBarQuery {
  queryText: string;
  error?: { message: string };
}

export const FieldsPanel: FC<Props> = ({
  title,
  totalFieldCount,
  populatedFieldCount,
  showAllFields,
  setShowAllFields,
  fieldTypes,
  showFieldType,
  setShowFieldType,
  fieldSearchBarQuery,
  setFieldSearchBarQuery,
  fieldVisConfigs,
}) => {
  function onShowAllFieldsChange() {
    setShowAllFields(!showAllFields);
  }

  function onSearchBarChange(query: SearchBarQuery) {
    if (query.error) {
      toastNotifications.addWarning(
        i18n.translate('xpack.ml.datavisualizer.fieldsPanel.searchBarError', {
          defaultMessage: `An error occurred running the search. {message}.`,
          values: { message: query.error.message },
        })
      );
    } else {
      setFieldSearchBarQuery(query.queryText);
    }
  }

  return (
    <EuiPanel data-test-subj={`mlDataVisualizerFieldsPanel ${fieldTypes}`}>
      <EuiTitle>
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <span>
            {showAllFields === true ? (
              <FormattedMessage
                id="xpack.ml.datavisualizer.fieldsPanel.showAllCountDescription"
                defaultMessage="{wrappedCardsCount} {cardsCount, plural, one {field} other {fields}} ({wrappedPopulatedFieldCount} {populatedFieldCount, plural, one {exists} other {exist}} in documents)"
                values={{
                  cardsCount: fieldVisConfigs.length,
                  wrappedCardsCount: <b>{fieldVisConfigs.length}</b>,
                  populatedFieldCount,
                  wrappedPopulatedFieldCount: <b>{populatedFieldCount}</b>,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.datavisualizer.fieldsPanel.fieldsCountDescription"
                defaultMessage="{wrappedCardsCount} {cardsCount, plural, one {field exists} other {fields exist}} in documents ({wrappedTotalFieldCount} in total)"
                values={{
                  cardsCount: fieldVisConfigs.length,
                  wrappedCardsCount: <b>{fieldVisConfigs.length}</b>,
                  wrappedTotalFieldCount: <b>{totalFieldCount}</b>,
                }}
              />
            )}
          </span>
        </EuiFlexItem>
        {populatedFieldCount < totalFieldCount && (
          <EuiFlexItem>
            <EuiCheckbox
              id={`${title}_show_empty_fields`}
              label={i18n.translate('xpack.ml.datavisualizer.fieldsPanel.showEmptyFieldsLabel', {
                defaultMessage: 'show empty fields',
              })}
              checked={showAllFields}
              onChange={onShowAllFieldsChange}
              data-test-subj="mlDataVisualizerShowEmptyFieldsCheckbox"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true}>
          <EuiFlexGroup alignItems="center" gutterSize="m" direction="rowReverse">
            <EuiFlexItem
              style={{ maxWidth: '400px' }}
              data-test-subj="mlDataVisualizerFieldsSearchBarDiv"
            >
              <EuiSearchBar
                defaultQuery=""
                query={fieldSearchBarQuery}
                box={{
                  placeholder: i18n.translate(
                    'xpack.ml.datavisualizer.fieldsPanel.filterFieldsPlaceholder',
                    {
                      defaultMessage: 'filter',
                    }
                  ),
                }}
                onChange={onSearchBarChange}
                data-test-subj="mlDataVisualizerFieldsSearchBar"
              />
            </EuiFlexItem>
            {typeof setShowFieldType === 'function' && (
              <EuiFlexItem grow={false}>
                <FieldTypesSelect
                  fieldTypes={fieldTypes}
                  selectedFieldType={showFieldType}
                  setSelectedFieldType={setShowFieldType}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGrid gutterSize="m">
        {fieldVisConfigs.map((visConfig, i) => (
          <EuiFlexItem key={`card_${i}`} style={{ minWidth: '360px' }}>
            <FieldDataCard config={visConfig} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};
