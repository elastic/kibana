/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { debounce } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataFederationKibanaServices } from '../../types';
import { automaticFieldTypesToMappings, mappingsToAutomaticFieldTypes } from '../automatic_field_types_utils';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';

export interface InferredSchemaMappingsEditorProps {
  control: Control<DatasetWizardFormValues>;
  hasSchemaModifications: boolean;
  onReset: () => void;
}

export const InferredSchemaMappingsEditor: FunctionComponent<InferredSchemaMappingsEditorProps> = ({
  control,
  hasSchemaModifications,
  onReset,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [resetButtonMount, setResetButtonMount] = useState<HTMLElement | null>(null);
  const {
    services: { indexManagement, scopedHistory },
  } = useKibana<DataFederationKibanaServices>();
  const { field } = useController({
    control,
    name: 'automatic_field_types',
  });
  const [mappings] = useState(() => automaticFieldTypesToMappings(field.value ?? {}));
  const latestFieldTypesRef = useRef<Record<string, string>>(field.value ?? {});

  const debouncedSyncToForm = useMemo(
    () =>
      debounce((nextFieldTypes: Record<string, string>) => {
        field.onChange(nextFieldTypes);
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
      const nextMappings = (getData() ?? {}) as Record<string, unknown>;
      const nextFieldTypes = mappingsToAutomaticFieldTypes(nextMappings);
      latestFieldTypesRef.current = nextFieldTypes;
      debouncedSyncToForm(nextFieldTypes);
    },
    [debouncedSyncToForm]
  );

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const setupFooter = (): boolean => {
      const addFieldButton = root.querySelector<HTMLElement>('[data-test-subj="addFieldButton"]');
      if (!addFieldButton?.parentElement) {
        return false;
      }

      let footer = root.querySelector<HTMLElement>('[data-test-subj="datasetWizardSchemaFieldsFooter"]');
      if (!footer) {
        footer = document.createElement('div');
        footer.dataset.testSubj = 'datasetWizardSchemaFieldsFooter';
        footer.style.display = 'flex';
        footer.style.alignItems = 'center';
        footer.style.gap = euiTheme.size.s;
        footer.style.marginTop = euiTheme.size.m;

        const spacer = addFieldButton.previousElementSibling;
        addFieldButton.parentElement.insertBefore(footer, spacer ?? addFieldButton);
        spacer?.remove();

        const resetMount = document.createElement('div');
        resetMount.dataset.testSubj = 'datasetWizardResetInferredSchemaMount';
        footer.appendChild(addFieldButton);
        footer.appendChild(resetMount);
      }

      const resetMount = footer.querySelector<HTMLElement>(
        '[data-test-subj="datasetWizardResetInferredSchemaMount"]'
      );
      if (resetMount) {
        setResetButtonMount(resetMount);
      }

      return true;
    };

    if (setupFooter()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (setupFooter()) {
        observer.disconnect();
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [euiTheme.size.m, euiTheme.size.s, mappings]);

  return (
    <div ref={containerRef} data-test-subj="datasetWizardInferredSchemaMappingsEditor">
      <MappedFieldsEditorComponent value={mappings} onChange={onMappingsChange} />
      {resetButtonMount
        ? createPortal(
            <EuiButtonEmpty
              iconType="refresh"
              data-test-subj="datasetWizardResetInferredSchema"
              onClick={onReset}
              disabled={!hasSchemaModifications}
            >
              {datasetWizardStrings.resetInferredSchemaButton()}
            </EuiButtonEmpty>,
            resetButtonMount
          )
        : null}
    </div>
  );
};
