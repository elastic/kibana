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
import { EditFieldFormRow } from '../fields/edit_field';
import { AnalyzerParameter } from './analyzer_parameter';
import { documentationService } from '../../../../../services/documentation';

interface Props {
  field: NormalizedField;
  withSearchQuoteAnalyzer?: boolean;
}

export const AnalyzersParameter = ({ field, withSearchQuoteAnalyzer = false }: Props) => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.analyzersSectionTitle', {
        defaultMessage: 'Analyzers',
      })}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.analyzersDocLinkText', {
          defaultMessage: 'Analyzers documentation',
        }),
        href: documentationService.getAnalyzerLink(),
      }}
      withToggle={false}
    >
      <FormDataProvider pathsToWatch="useSameAnalyzerForSearch">
        {({ useSameAnalyzerForSearch }) => {
          const label = useSameAnalyzerForSearch
            ? i18n.translate('xpack.idxMgmt.mappingsEditor.indexSearchAnalyzerFieldLabel', {
                defaultMessage: 'Index and search analyzer',
              })
            : i18n.translate('xpack.idxMgmt.mappingsEditor.indexAnalyzerFieldLabel', {
                defaultMessage: 'Index analyzer',
              });

          return (
            <AnalyzerParameter
              path="analyzer"
              label={label}
              defaultValue={field.source.analyzer as string}
            />
          );
        }}
      </FormDataProvider>

      <EuiSpacer size="s" />

      <UseField
        path="useSameAnalyzerForSearch"
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

      <FormDataProvider pathsToWatch="useSameAnalyzerForSearch">
        {({ useSameAnalyzerForSearch }) =>
          useSameAnalyzerForSearch ? null : (
            <>
              <EuiSpacer size="m" />
              <AnalyzerParameter
                path="search_analyzer"
                defaultValue={field.source.search_analyzer as string}
                config={getFieldConfig('search_analyzer')}
              />
              <EuiSpacer size="s" />
            </>
          )
        }
      </FormDataProvider>

      {withSearchQuoteAnalyzer && (
        <>
          <EuiSpacer size="m" />
          <AnalyzerParameter
            path="search_quote_analyzer"
            defaultValue={field.source.search_quote_analyzer as string}
            config={getFieldConfig('search_quote_analyzer')}
          />
        </>
      )}
    </EditFieldFormRow>
  );
};
