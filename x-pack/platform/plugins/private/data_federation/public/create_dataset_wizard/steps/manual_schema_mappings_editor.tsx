/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { debounce } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataFederationKibanaServices } from '../../types';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';

export interface ManualSchemaMappingsEditorProps {
  control: Control<DatasetWizardFormValues>;
}

export const ManualSchemaMappingsEditor: FunctionComponent<ManualSchemaMappingsEditorProps> = ({
  control,
}) => {
  const {
    services: { indexManagement, scopedHistory },
  } = useKibana<DataFederationKibanaServices>();
  const { field } = useController({
    control,
    name: 'manual_mappings',
  });
  const [mappings] = useState(() => field.value ?? {});
  const latestMappingsRef = useRef<Record<string, object>>(field.value ?? {});

  const debouncedSyncToForm = useMemo(
    () =>
      debounce((nextMappings: Record<string, object>) => {
        field.onChange(nextMappings);
      }, 250),
    [field.onChange]
  );

  useEffect(
    () => () => {
      debouncedSyncToForm.flush();
    },
    [debouncedSyncToForm]
  );

  const MappedFieldsEditorComponent = useMemo(
    () =>
      indexManagement.getMappedFieldsEditorComponent({
        history: scopedHistory,
      }),
    [indexManagement, scopedHistory]
  );

  const onMappingsChange = useCallback<MappedFieldsEditorProps['onChange']>(
    ({ getData }) => {
      const nextMappings = (getData() ?? {}) as Record<string, object>;
      latestMappingsRef.current = nextMappings;
      debouncedSyncToForm(nextMappings);
    },
    [debouncedSyncToForm]
  );

  return (
    <div data-test-subj="datasetWizardManualSchemaMappingsEditor">
      <MappedFieldsEditorComponent value={mappings} onChange={onMappingsChange} />
    </div>
  );
};
