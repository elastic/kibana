/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';

import { UseField, CheckBoxField, FormDataProvider } from '../../../shared_imports';
import { NormalizedField } from '../../../types';
import { getFieldConfig } from '../../../lib';
import { EditFieldSection } from '../fields/edit_field';
import { AnalyzerParameter } from './analyzer_parameter';

interface Props {
  id: string;
  field: NormalizedField;
  withSearchQuoteAnalyzer?: boolean;
}

export const AnalyzersParameter = ({ id, field, withSearchQuoteAnalyzer = false }: Props) => {
  const useSameAnalyzerForSearchId = `useSameAnalyzerForSearch-${id}`;

  return (
    <EditFieldSection
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.analyzersSectionTitle', {
        defaultMessage: 'Analyzers',
      })}
    >
      <FormDataProvider pathsToWatch={useSameAnalyzerForSearchId}>
        {data => {
          const useSameAnalyzerForSearch = data[useSameAnalyzerForSearchId];
          const label = useSameAnalyzerForSearch
            ? i18n.translate('xpack.idxMgmt.mappingsEditor.indexSearchAnalyzerFieldLabel', {
                defaultMessage: 'Index and search analyzer',
              })
            : i18n.translate('xpack.idxMgmt.mappingsEditor.indexAnalyzerFieldLabel', {
                defaultMessage: 'Index analyzer',
              });

          return (
            <AnalyzerParameter path="analyzer" label={label} defaultValue={field.source.analyzer} />
          );
        }}
      </FormDataProvider>

      <EuiSpacer size="s" />

      <UseField
        path={useSameAnalyzerForSearchId}
        component={CheckBoxField}
        config={{
          label: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.analyzers.useSameAnalyzerIndexAnSearch',
            {
              defaultMessage: 'Use the same analyzers for index and searching',
            }
          ),
          defaultValue: true,
        }}
      />

      <FormDataProvider pathsToWatch={useSameAnalyzerForSearchId}>
        {data => {
          const useSameAnalyzerForSearch = data[useSameAnalyzerForSearchId];
          return useSameAnalyzerForSearch ? null : (
            <>
              <EuiSpacer />
              <AnalyzerParameter
                path="search_analyzer"
                defaultValue={field.source.searchAnalyzer}
                config={getFieldConfig('search_analyzer')}
              />
            </>
          );
        }}
      </FormDataProvider>

      {withSearchQuoteAnalyzer && (
        <>
          <EuiSpacer />
          <AnalyzerParameter
            path="search_quote_analyzer"
            defaultValue={field.source.search_quote_analyzer}
            config={getFieldConfig('search_quote_analyzer')}
          />
        </>
      )}
    </EditFieldSection>
  );
};
