/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../../../contexts/kibana';
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
  const {
    services: { notifications },
  } = useMlKibana();
  function onShowAllFieldsChange() {
    setShowAllFields(!showAllFields);
  }

  function onSearchBarChange(query: SearchBarQuery) {
    if (query.error) {
      const { toasts } = notifications;
      toasts.addWarning(
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
    <div data-test-subj={`mlDataVisualizerFieldsPanel ${fieldTypes}`}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.fieldsPanel.countDescription"
                    defaultMessage="{cardsCount} {cardsCount, plural, one {field exists} other {fields exist}} in documents sampled"
                    values={{ cardsCount: populatedFieldCount }}
                  />
                }
              >
                <EuiBadge title="">
                  <b>{populatedFieldCount}</b>
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.ml.datavisualizer.fieldsPanel.totalFieldLabel"
                  defaultMessage="Total fields: {wrappedTotalFields}"
                  values={{
                    wrappedTotalFields: <b>{totalFieldCount}</b>,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            {populatedFieldCount < totalFieldCount && (
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  id={`${title}_show_empty_fields`}
                  label={i18n.translate(
                    'xpack.ml.datavisualizer.fieldsPanel.showEmptyFieldsLabel',
                    {
                      defaultMessage: 'Show empty fields',
                    }
                  )}
                  checked={showAllFields}
                  onChange={onShowAllFieldsChange}
                  data-test-subj="mlDataVisualizerShowEmptyFieldsCheckbox"
                  compressed
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

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
                    { defaultMessage: 'Filter {type}', values: { type: title } }
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
      <EuiSpacer size="m" />
      <EuiFlexGrid gutterSize="m">
        {fieldVisConfigs
          .filter(({ stats }) => stats !== undefined)
          .map((visConfig, i) => (
            <EuiFlexItem
              key={`${visConfig.fieldName}_${visConfig.stats.count}`}
              style={{ minWidth: '360px' }}
            >
              <FieldDataCard config={visConfig} />
            </EuiFlexItem>
          ))}
      </EuiFlexGrid>
    </div>
  );
};
