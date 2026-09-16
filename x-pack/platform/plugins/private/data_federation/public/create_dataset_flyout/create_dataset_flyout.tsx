/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useForm } from 'react-hook-form';

import type { DataSetWithName, DataSource } from '../../common';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import { CreateDatasetDetailsFields } from './create_dataset_details_fields';
import {
  buildDatasetSettingsFromFormValues,
  type CreateDatasetFormValues,
} from './create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import { CreateDatasetFlyoutSettings } from './create_dataset_flyout_settings';
import {
  dataSetToFlyoutFormValues,
  emptyDatasetFlyoutFormValues,
} from './dataset_flyout_initial_values';

export type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';

export interface CreateDatasetFlyoutProps {
  /** When set, the flyout opens in edit mode for this data set. */
  initialDataSet?: DataSetWithName;
  /** Existing names to prevent duplicates (create mode only). */
  existingDataSetNames?: readonly string[];
  onClose: () => void;
  /**
   * Persist a data set (create or update). Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (data: DataSetWithName, previousId?: string) => Promise<string | null>;
  /** Data sources used to populate the data source selector (typically `DataSourcesClient.get()`). */
  dataSources: DataSource[];
}

export const CreateDatasetFlyout: FunctionComponent<CreateDatasetFlyoutProps> = ({
  initialDataSet,
  existingDataSetNames = [],
  onClose,
  onSave,
  dataSources,
}) => {
  const isEditMode = initialDataSet !== undefined;
  const initialIdNormalized = initialDataSet?.name?.trim().toLowerCase() ?? '';
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const flyoutTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saveError) {
      flyoutTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [saveError]);

  const formDefaultValues = useMemo(
    (): CreateDatasetFormValues =>
      initialDataSet ? dataSetToFlyoutFormValues(initialDataSet) : emptyDatasetFlyoutFormValues(),
    [initialDataSet]
  );

  const { handleSubmit, control, reset, watch } = useForm<CreateDatasetFormValues>({
    defaultValues: formDefaultValues,
  });

  const dataSourceValue = watch('data_source');

  useEffect(() => {
    if (!initialDataSet) {
      return;
    }
    reset(dataSetToFlyoutFormValues(initialDataSet));
  }, [initialDataSet, reset]);

  const onSubmit = async (values: CreateDatasetFormValues) => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const desc = values.description?.trim();
      const settings = buildDatasetSettingsFromFormValues(values.settings);
      const payload: DataSetWithName = {
        name: values.name.trim(),
        data_source: values.data_source.trim(),
        resource: values.resource.trim(),
        ...(desc ? { description: desc } : {}),
        ...(settings ? { settings } : {}),
      };
      const message = await onSave(payload, initialDataSet?.name);
      if (message) {
        setSaveError(message);
      }
    } catch (error) {
      setSaveError(getFlyoutSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const flyoutTitle = isEditMode
    ? createDatasetFlyoutStrings.editTitleWithId(initialDataSet?.name ?? '')
    : createDatasetFlyoutStrings.createTitle();

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDatasetFlyoutTitle"
      size="m"
      data-test-subj={isEditMode ? 'editDatasetFlyout' : 'createDatasetFlyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDatasetFlyoutTitle">{flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div ref={flyoutTopRef} />
        <EuiForm component="form" id="createDatasetForm" onSubmit={handleSubmit(onSubmit)}>
          {saveError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="createDatasetFlyoutSaveError">
                {saveError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <CreateDatasetDetailsFields
            control={control}
            dataSources={dataSources}
            existingDataSetNames={existingDataSetNames}
            isEditMode={isEditMode}
            initialIdNormalized={initialIdNormalized}
            autoFocusName={!isEditMode}
          />
          {dataSourceValue ? <CreateDatasetFlyoutSettings control={control} /> : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="createDatasetFlyoutCancel" onClick={onClose}>
              {createDatasetFlyoutStrings.cancelButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              data-test-subj="createDatasetFlyoutSubmit"
              form="createDatasetForm"
              isLoading={isSaving}
              disabled={isSaving || dataSources.length === 0}
            >
              {isEditMode
                ? createDatasetFlyoutStrings.saveButton()
                : createDatasetFlyoutStrings.addButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
