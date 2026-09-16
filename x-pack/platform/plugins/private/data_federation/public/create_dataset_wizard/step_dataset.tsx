/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { useFormContext, useWatch } from 'react-hook-form';

import type { DataSource } from '../../common';
import { CreateDatasetDetailsFields } from '../create_dataset_flyout/create_dataset_details_fields';
import type { CreateDatasetFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetWizardContent } from './types';

export function StepDataset({
  dataSources,
  existingDataSetNames,
}: {
  dataSources: DataSource[];
  existingDataSetNames: readonly string[];
}) {
  const { control, getValues, trigger } = useFormContext<CreateDatasetFormValues>();
  const { updateContent } = Forms.useContent<DatasetWizardContent, 'dataset'>('dataset');
  const name = useWatch({ control, name: 'name' });
  const dataSource = useWatch({ control, name: 'data_source' });
  const resource = useWatch({ control, name: 'resource' });

  useEffect(() => {
    // FormWizard's validate() treats any content with isValid === undefined as a
    // failed navigation (Boolean(undefined) === false), including unmounted steps.
    // Always report a boolean so Next/Back on later steps can proceed.
    const isValid = Boolean(name?.trim() && dataSource?.trim() && resource?.trim());
    updateContent({
      isValid,
      validate: async () => trigger(['name', 'data_source', 'resource']),
      getData: () => {
        const values = getValues();
        return {
          name: values.name,
          description: values.description,
          data_source: values.data_source,
          resource: values.resource,
        };
      },
    });
  }, [name, dataSource, resource, getValues, trigger, updateContent]);

  return (
    <div data-test-subj="createDatasetWizardDatasetStep">
      <CreateDatasetDetailsFields
        control={control}
        dataSources={dataSources}
        existingDataSetNames={existingDataSetNames}
        autoFocusName={true}
      />
    </div>
  );
}
