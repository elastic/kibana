/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { EuiPageBody, EuiPageSection } from '@elastic/eui';
import { parse } from 'query-string';
import { FormattedMessage } from '@kbn/i18n-react';
import { type DataViewEditorService as DataViewEditorServiceSpec } from '@kbn/data-view-editor-plugin/public';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import { DataDriftIndexPatternsEditor } from './data_drift_index_patterns_editor';

import { MlPageHeader } from '../../components/page_header';
import { useMlKibana } from '../../contexts/kibana';
import { PageTitle } from '../../components/page_title';

export const DataDriftIndexPatternsPicker: FC = () => {
  const { reference, comparison } = parse(location.search, {
    sort: false,
  }) as { reference: string; comparison: string };

  const [dataViewEditorServices, setDataViewEditorServices] = useState<
    | {
        referenceDataViewEditorService: DataViewEditorServiceSpec;
        comparisonDataViewEditorService: DataViewEditorServiceSpec;
      }
    | undefined
  >();

  const {
    services: {
      dataViewEditor,
      http,
      data: { dataViews },
    },
  } = useMlKibana();
  const { dataViewEditorServiceFactory } = dataViewEditor;

  const initialComparisonIndexPattern = useMemo(
    () => (comparison ? comparison.replaceAll(`'`, '') : ''),
    [comparison]
  );
  const initialReferenceIndexPattern = useMemo(
    () => (reference ? reference.replaceAll(`'`, '') : ''),
    [reference]
  );

  useEffect(() => {
    let unmounted = false;
    const getDataViewEditorService = async () => {
      if (http && dataViews && dataViewEditorServiceFactory) {
        const { DataViewEditorService } = await dataViewEditorServiceFactory();
        const referenceDataViewEditorService = new DataViewEditorService({
          // @ts-expect-error Mismatch in DataViewsServicePublic import, but should be same
          services: { http, dataViews },
          initialValues: {
            name: '',
            type: INDEX_PATTERN_TYPE.DEFAULT,
            indexPattern: initialReferenceIndexPattern,
          },
          requireTimestampField: false,
        });
        const comparisonDataViewEditorService = new DataViewEditorService({
          // @ts-expect-error Mismatch in DataViewsServicePublic import, but should be same
          services: { http, dataViews },
          initialValues: {
            name: '',
            type: INDEX_PATTERN_TYPE.DEFAULT,
            indexPattern: initialComparisonIndexPattern,
          },
          requireTimestampField: false,
        });
        if (!unmounted) {
          setDataViewEditorServices({
            referenceDataViewEditorService,
            comparisonDataViewEditorService,
          });
        }
      }
    };
    getDataViewEditorService();

    return () => {
      unmounted = true;
    };
  }, [
    dataViewEditorServiceFactory,
    http,
    dataViews,
    initialReferenceIndexPattern,
    initialComparisonIndexPattern,
  ]);

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <PageTitle
            title={
              <FormattedMessage
                id="xpack.ml.dataDrift.createDataDriftDataViewTitle"
                defaultMessage="Create data view and analyze data drift"
              />
            }
          />
        </MlPageHeader>
        <EuiPageSection>
          {dataViewEditorServices ? (
            <DataDriftIndexPatternsEditor
              initialComparisonIndexPattern={initialComparisonIndexPattern}
              initialReferenceIndexPattern={initialReferenceIndexPattern}
              referenceDataViewEditorService={dataViewEditorServices.referenceDataViewEditorService}
              comparisonDataViewEditorService={
                dataViewEditorServices.comparisonDataViewEditorService
              }
            />
          ) : null}
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
