/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';

export function IndexSelection() {
  const { control, getFieldState, setValue, watch } = useFormContext<CreateSLOForm>();
  const { dataViews: dataViewsService } = useKibana().services;

  const { isLoading: isDataViewsLoading, data: dataViews = [] } = useFetchDataViews();

  const { dataViewEditor } = useKibana().services;

  const [adHocDataViews, setAdHocDataViews] = useState<DataView[]>([]);

  const currentIndexPattern = watch('indicator.params.index');

  useEffect(() => {
    if (!isDataViewsLoading) {
      const missingAdHocDataView =
        dataViews.find((dataView) => dataView.title === currentIndexPattern) ||
        adHocDataViews.find((dataView) => dataView.getIndexPattern() === currentIndexPattern);

      if (!missingAdHocDataView && currentIndexPattern) {
        async function loadMissingDataView() {
          const dataView = await dataViewsService.create(
            {
              title: currentIndexPattern,
              allowNoIndex: true,
            },
            true
          );
          if (dataView.getIndexPattern() === currentIndexPattern) {
            setAdHocDataViews((prev) => [...prev, dataView]);
          }
        }

        loadMissingDataView();
      }
    }
  }, [adHocDataViews, currentIndexPattern, dataViews, dataViewsService, isDataViewsLoading]);

  const getDataViewPatternById = (id?: string) => {
    return (
      dataViews.find((dataView) => dataView.id === id)?.title ||
      adHocDataViews.find((dataView) => dataView.id === id)?.getIndexPattern()
    );
  };

  const getDataViewIdByIndexPattern = (indexPattern: string) => {
    return (
      dataViews.find((dataView) => dataView.title === indexPattern) ||
      adHocDataViews.find((dataView) => dataView.getIndexPattern() === indexPattern)
    );
  };

  return (
    <EuiFormRow label={INDEX_LABEL} isInvalid={getFieldState('indicator.params.index').invalid}>
      <Controller
        defaultValue=""
        name="indicator.params.index"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <DataViewPicker
            adHocDataViews={adHocDataViews}
            trigger={{
              label: field.value || SELECT_DATA_VIEW,
              fullWidth: true,
              color: fieldState.invalid ? 'danger' : 'text',
              isLoading: isDataViewsLoading,
              'data-test-subj': 'indexSelection',
            }}
            onChangeDataView={(newId: string) => {
              field.onChange(getDataViewPatternById(newId));
              dataViewsService.get(newId).then((dataView) => {
                if (dataView.timeFieldName) {
                  setValue('indicator.params.timestampField', dataView.timeFieldName);
                }
              });
            }}
            currentDataViewId={getDataViewIdByIndexPattern(field.value)?.id}
            onDataViewCreated={() => {
              dataViewEditor.openEditor({
                allowAdHocDataView: true,
                onSave: (dataView: DataView) => {
                  if (!dataView.isPersisted()) {
                    setAdHocDataViews([...adHocDataViews, dataView]);
                    field.onChange(dataView.getIndexPattern());
                  } else {
                    field.onChange(getDataViewPatternById(dataView.id));
                  }
                  if (dataView.timeFieldName) {
                    setValue('indicator.params.timestampField', dataView.timeFieldName);
                  }
                },
              });
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}

const SELECT_DATA_VIEW = i18n.translate('xpack.slo.sloEdit.customKql.dataViewSelection.label', {
  defaultMessage: 'Select a Data view',
});

const INDEX_LABEL = i18n.translate('xpack.slo.sloEdit.customKql.indexSelection.label', {
  defaultMessage: 'Index',
});
