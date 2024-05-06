/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useMemo, useEffect, useCallback } from 'react';

import useObservable from 'react-use/lib/useObservable';
import { firstValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  EuiAccordion,
  EuiCode,
  EuiCodeBlock,
  EuiFormRow,
  EuiSpacer,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../contexts/kibana';
import { RUNNING_STATE } from './inference_base';
import type { InferrerType } from '.';

interface Props {
  inferrer: InferrerType;
  data: ReturnType<typeof useIndexInput>;
  disableIndexSelection: boolean;
}

export const InferenceInputFormIndexControls: FC<Props> = ({
  inferrer,
  data,
  disableIndexSelection,
}) => {
  const {
    dataViewListItems,
    fieldNames,
    selectedDataViewId,
    setSelectedDataViewId,
    selectedField,
    setSelectedField,
  } = data;

  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());
  const pipeline = useObservable(inferrer.getPipeline$(), inferrer.getPipeline());
  const inputComponent = useMemo(() => inferrer.getInputComponent(), [inferrer]);

  return (
    <>
      <EuiFormRow label="Index" fullWidth>
        {disableIndexSelection ? (
          <EuiText grow={false}>
            <EuiCode>
              {dataViewListItems.find((item) => item.value === selectedDataViewId)?.text}
            </EuiCode>
          </EuiText>
        ) : (
          <EuiSelect
            options={dataViewListItems}
            value={selectedDataViewId}
            onChange={(e) => {
              inferrer.setSelectedDataViewId(e.target.value);
              setSelectedDataViewId(e.target.value);
            }}
            hasNoInitialSelection={true}
            disabled={runningState === RUNNING_STATE.RUNNING}
            fullWidth
          />
        )}
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.ml.trainedModels.testModelsFlyout.indexInput.fieldInput', {
          defaultMessage: 'Field',
        })}
        fullWidth
      >
        <EuiSelect
          options={fieldNames}
          value={selectedField}
          onChange={(e) => {
            setSelectedField(e.target.value);
          }}
          hasNoInitialSelection={true}
          disabled={runningState === RUNNING_STATE.RUNNING}
          fullWidth
        />
      </EuiFormRow>

      <>{inputComponent}</>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={'simpleAccordionId'}
        buttonContent={i18n.translate(
          'xpack.ml.trainedModels.testModelsFlyout.indexInput.viewPipeline',
          {
            defaultMessage: 'View pipeline',
          }
        )}
      >
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="s"
          lineNumbers
          isCopyable={true}
          overflowHeight={300}
        >
          {JSON.stringify(pipeline, null, 2)}
        </EuiCodeBlock>
      </EuiAccordion>
    </>
  );
};

export function useIndexInput({
  inferrer,
  defaultSelectedDataViewId,
}: {
  inferrer: InferrerType;
  defaultSelectedDataViewId?: string;
}) {
  const {
    services: {
      data: {
        dataViews,
        search: { search },
      },
    },
  } = useMlKibana();

  const [dataViewListItems, setDataViewListItems] = useState<
    Array<{ value: string; text: string }>
  >([]);
  const [selectedDataViewId, setSelectedDataViewId] = useState<string | undefined>(
    defaultSelectedDataViewId
  );
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [fieldNames, setFieldNames] = useState<Array<{ value: string; text: string }>>([]);
  const selectedField = useObservable(inferrer.getInputField$(), inferrer.getInputField());

  const setSelectedField = useCallback(
    (fieldName: string) => inferrer.setInputField(fieldName),
    [inferrer]
  );
  useEffect(
    function loadDataViewListItems() {
      async function getFilteredDataViewListItems() {
        const dataViewIds = await dataViews.getIdsWithTitle();
        const supportedFieldTypes = inferrer.getSupportedFieldTypes();

        const hasTextField = async ({ id }: { id: string }) => {
          const dataView = await dataViews.get(id);

          return dataView.fields
            .getAll()
            .some((dvField) =>
              supportedFieldTypes.some((esType) => dvField.esTypes?.includes(esType))
            );
        };

        const allPromises = dataViewIds.map(hasTextField);
        const resolvedPromises = await Promise.all(allPromises);
        const filteredDataViews = dataViewIds.filter((value, index) => resolvedPromises[index]);

        setDataViewListItems(
          filteredDataViews
            .sort((a, b) => a.title.localeCompare(b.title))
            .map(({ id, title }) => ({ text: title, value: id }))
        );
      }

      getFilteredDataViewListItems();
    },
    [dataViews, inferrer]
  );

  useEffect(
    function loadSelectedDataView() {
      inferrer.reset();
      setFieldNames([]);
      if (selectedDataViewId !== undefined) {
        dataViews.get(selectedDataViewId).then((dv) => setSelectedDataView(dv));
      }
    },
    [selectedDataViewId, dataViews, inferrer]
  );

  const loadExamples = useCallback(() => {
    inferrer.setInputText([]);
    if (selectedField !== undefined && selectedDataView !== null) {
      firstValueFrom(
        search({
          params: {
            index: selectedDataView.getIndexPattern(),
            body: {
              fields: [selectedField],
              query: {
                function_score: {
                  functions: [
                    {
                      random_score: {},
                    },
                  ],
                },
              },
            },
          },
        })
      ).then((resp) => {
        const tempExamples = resp.rawResponse.hits.hits
          .filter(({ fields }) => isPopulatedObject(fields, [selectedField]))
          .map(({ fields }) => fields![selectedField][0]);
        inferrer.setInputText(tempExamples);
      });
    }
  }, [inferrer, selectedDataView, search, selectedField]);

  useEffect(
    function loadFieldNames() {
      if (selectedDataView !== null) {
        const tempFieldNames = selectedDataView.fields
          .filter(
            ({ displayName, esTypes }) =>
              esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
          )
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map(({ displayName }) => ({
            value: displayName,
            text: displayName,
          }));
        setFieldNames(tempFieldNames);

        const defaultSelectedField = inferrer.getInputField();

        const fieldName =
          defaultSelectedField &&
          tempFieldNames.find((field) => field.value === defaultSelectedField)
            ? defaultSelectedField
            : tempFieldNames[0].value;
        // Only set a field if it's the default field
        // if (inferrer.getInputField() === DEFAULT_INPUT_FIELD) {
        inferrer.setInputField(fieldName);
        // }
      }
    },
    [selectedDataView, inferrer] // defaultSelectedField
  );

  useEffect(
    function loadExamplesAfterFieldChange() {
      loadExamples();
    },
    // only load examples if selectedField changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedField]
  );

  function reloadExamples() {
    inferrer.reset();
    loadExamples();
  }

  return {
    fieldNames,
    dataViewListItems,
    reloadExamples,
    selectedDataViewId,
    setSelectedDataViewId,
    selectedField,
    setSelectedField,
  };
}
