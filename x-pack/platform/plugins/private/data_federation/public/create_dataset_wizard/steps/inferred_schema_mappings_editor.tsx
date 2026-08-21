/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiSplitButton,
  useEuiTheme,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { debounce } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataFederationKibanaServices } from '../../types';
import {
  automaticFieldTypesToMappings,
  mappingsToAutomaticFieldTypes,
  mergeMissingAutomaticFieldTypes,
  seedAutomaticFieldTypesFromInferred,
} from '../automatic_field_types_utils';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import type { TestConfigurationPreviewField } from '../test_configuration_preview_utils';

export interface InferredSchemaMappingsEditorProps {
  control: Control<DatasetWizardFormValues>;
  inferredFields: readonly TestConfigurationPreviewField[];
}

const ACTIONS_MOUNT_TEST_SUBJ = 'datasetWizardSchemaFieldsActionsMount';

export const InferredSchemaMappingsEditor: FunctionComponent<InferredSchemaMappingsEditorProps> = ({
  control,
  inferredFields,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const addFieldButtonRef = useRef<HTMLElement | null>(null);
  const [actionsMount, setActionsMount] = useState<HTMLElement | null>(null);
  const {
    services: { indexManagement, scopedHistory },
  } = useKibana<DataFederationKibanaServices>();
  const { field } = useController({
    control,
    name: 'automatic_field_types',
  });

  const [schemaEditorKey, setSchemaEditorKey] = useState(0);
  const [isInferMenuOpen, setIsInferMenuOpen] = useState(false);
  const [isAddFieldFormOpen, setIsAddFieldFormOpen] = useState(false);
  const [seedFieldTypes, setSeedFieldTypes] = useState<Record<string, string>>(
    () => field.value ?? {}
  );
  const [hasFields, setHasFields] = useState(() => Object.keys(field.value ?? {}).length > 0);
  const latestFieldTypesRef = useRef<Record<string, string>>(field.value ?? {});

  const mappings = useMemo(() => automaticFieldTypesToMappings(seedFieldTypes), [seedFieldTypes]);

  const inferredFieldTypes = useMemo(
    () => seedAutomaticFieldTypesFromInferred(inferredFields),
    [inferredFields]
  );

  const debouncedSyncToForm = useMemo(
    () =>
      debounce((nextFieldTypes: Record<string, string>) => {
        field.onChange(nextFieldTypes);
      }, 250),
    [field]
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
      setHasFields(Object.keys(nextFieldTypes).length > 0);
      debouncedSyncToForm(nextFieldTypes);
    },
    [debouncedSyncToForm]
  );

  const applyFieldTypes = useCallback(
    (nextFieldTypes: Record<string, string>) => {
      debouncedSyncToForm.cancel();
      latestFieldTypesRef.current = nextFieldTypes;
      field.onChange(nextFieldTypes);
      setSeedFieldTypes(nextFieldTypes);
      setHasFields(Object.keys(nextFieldTypes).length > 0);
      setSchemaEditorKey((currentKey) => currentKey + 1);
    },
    [debouncedSyncToForm, field]
  );

  const handleInferSchema = useCallback(() => {
    applyFieldTypes(inferredFieldTypes);
  }, [applyFieldTypes, inferredFieldTypes]);

  const handleInferMissingFields = useCallback(() => {
    setIsInferMenuOpen(false);
    applyFieldTypes(
      mergeMissingAutomaticFieldTypes(latestFieldTypesRef.current, inferredFieldTypes)
    );
  }, [applyFieldTypes, inferredFieldTypes]);

  const handleAddField = useCallback(() => {
    addFieldButtonRef.current?.click();
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const syncAddFieldFormOpen = () => {
      const isOpen = root.querySelector('[data-test-subj="createFieldForm"]') !== null;
      setIsAddFieldFormOpen(isOpen);
    };

    syncAddFieldFormOpen();

    const observer = new MutationObserver(syncAddFieldFormOpen);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [schemaEditorKey]);

  // Hides the editor's own "Add field" control and portals a matching outlined
  // primary button into a sibling mount, alongside a split Infer schema control.
  // The extra node is untracked by the editor, so it won't fight React
  // reconciliation the way relocating existing nodes would.
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const setupMount = (): boolean => {
      const addFieldButton = root.querySelector<HTMLElement>('[data-test-subj="addFieldButton"]');
      if (!addFieldButton?.parentElement) {
        return false;
      }

      addFieldButtonRef.current = addFieldButton;

      let mount = root.querySelector<HTMLElement>(`[data-test-subj="${ACTIONS_MOUNT_TEST_SUBJ}"]`);
      if (!mount) {
        mount = document.createElement('span');
        mount.dataset.testSubj = ACTIONS_MOUNT_TEST_SUBJ;
        mount.style.display = 'inline-flex';
        mount.style.alignItems = 'center';
        mount.style.gap = euiTheme.size.s;
        addFieldButton.insertAdjacentElement('afterend', mount);
      }

      setActionsMount(mount);
      return true;
    };

    if (setupMount()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (setupMount()) {
        observer.disconnect();
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [euiTheme.size.s, schemaEditorKey]);

  return (
    <div
      ref={containerRef}
      data-test-subj="datasetWizardInferredSchemaMappingsEditor"
      css={css`
        [data-test-subj='addFieldButton'] {
          display: none;
        }
      `}
    >
      <MappedFieldsEditorComponent
        key={schemaEditorKey}
        value={mappings}
        compressed
        fieldEditDisplay="inline"
        onChange={onMappingsChange}
      />
      {actionsMount
        ? createPortal(
            <>
              {!isAddFieldFormOpen ? (
                <EuiButton
                  iconType="plusCircle"
                  color="primary"
                  size="s"
                  data-test-subj="datasetWizardAddField"
                  onClick={handleAddField}
                >
                  {datasetWizardStrings.addFieldButton()}
                </EuiButton>
              ) : null}
              <EuiSplitButton
                color="text"
                fill={false}
                size="s"
                data-test-subj="datasetWizardInferSchemaSplitButton"
              >
                <EuiSplitButton.ActionPrimary
                  iconType="indexMapping"
                  data-test-subj="datasetWizardInferSchema"
                  onClick={handleInferSchema}
                >
                  {datasetWizardStrings.inferSchemaButton()}
                </EuiSplitButton.ActionPrimary>
                <EuiSplitButton.ActionSecondary
                  iconType="arrowDown"
                  aria-label={datasetWizardStrings.inferSchemaMoreOptionsAriaLabel()}
                  data-test-subj="datasetWizardInferSchemaMenuButton"
                  onClick={() => setIsInferMenuOpen((isOpen) => !isOpen)}
                  popoverProps={{
                    isOpen: isInferMenuOpen,
                    closePopover: () => setIsInferMenuOpen(false),
                    anchorPosition: 'downRight',
                    panelPaddingSize: 'none',
                    children: (
                      <EuiContextMenuPanel
                        items={[
                          <EuiContextMenuItem
                            key="inferMissingFields"
                            icon="listBullet"
                            disabled={!hasFields}
                            data-test-subj="datasetWizardInferMissingFields"
                            onClick={handleInferMissingFields}
                          >
                            {datasetWizardStrings.inferMissingFieldsButton()}
                          </EuiContextMenuItem>,
                        ]}
                      />
                    ),
                  }}
                />
              </EuiSplitButton>
            </>,
            actionsMount
          )
        : null}
    </div>
  );
};
