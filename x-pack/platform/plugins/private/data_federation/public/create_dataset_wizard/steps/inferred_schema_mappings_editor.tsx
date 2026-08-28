/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { debounce } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataFederationKibanaServices } from '../../types';
import {
  automaticFieldTypesToMappings,
  getDynamicInferredFields,
  mappingsToAutomaticFieldTypes,
} from '../automatic_field_types_utils';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { formatMappedFieldTypeLabel } from '../inferred_field_type_options';
import type { TestConfigurationPreviewField } from '../test_configuration_preview_utils';

export interface InferredSchemaMappingsEditorProps {
  control: Control<DatasetWizardFormValues>;
  inferredFields: readonly TestConfigurationPreviewField[];
}

interface DynamicFieldRow {
  id: string;
  name: string;
  type: string;
}

const DynamicFieldsTable: FunctionComponent<{
  items: DynamicFieldRow[];
  onMapField: (name: string, type: string) => void;
}> = ({ items, onMapField }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<DynamicFieldRow>>>(
    () => [
      {
        field: 'name',
        name: datasetWizardStrings.automaticSchemaSampleFieldColumn(),
        truncateText: true,
        'data-test-subj': 'datasetWizardDynamicFieldNameColumn',
      },
      {
        field: 'type',
        name: datasetWizardStrings.automaticSchemaSampleTypeColumn(),
        render: (type: string) => (
          <EuiFlexGroup
            gutterSize="m"
            responsive={false}
            aria-label={datasetWizardStrings.dynamicFieldDataTypeAriaLabel()}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{formatMappedFieldTypeLabel(type)}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        'data-test-subj': 'datasetWizardDynamicFieldTypeColumn',
      },
      {
        name: '',
        width: '80px',
        align: 'right',
        render: (item: DynamicFieldRow) => (
          <EuiButtonEmpty
            size="s"
            flush="right"
            data-test-subj={`datasetWizardMapField-${item.name}`}
            aria-label={datasetWizardStrings.mapFieldAriaLabel(item.name)}
            onClick={() => onMapField(item.name, item.type)}
          >
            {datasetWizardStrings.mapFieldButton()}
          </EuiButtonEmpty>
        ),
      },
    ],
    [onMapField]
  );

  return (
    <EuiInMemoryTable<DynamicFieldRow>
      items={items}
      itemId="id"
      columns={columns}
      pagination={false}
      tableLayout="auto"
      responsiveBreakpoint={false}
      data-test-subj="datasetWizardDynamicFieldsTable"
      tableCaption={datasetWizardStrings.dynamicFieldsTableCaption()}
    />
  );
};

export const InferredSchemaMappingsEditor: FunctionComponent<InferredSchemaMappingsEditorProps> = ({
  control,
  inferredFields,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const addFieldButtonRef = useRef<HTMLElement | null>(null);
  const {
    services: { indexManagement, scopedHistory },
  } = useKibana<DataFederationKibanaServices>();
  const { field } = useController({
    control,
    name: 'automatic_field_types',
  });
  const { field: dynamicFieldsEnabledField } = useController({
    control,
    name: 'dynamic_fields_enabled',
  });
  const isDynamicEnabled = dynamicFieldsEnabledField.value !== false;

  const [schemaEditorKey, setSchemaEditorKey] = useState(0);
  const [isAddFieldFormOpen, setIsAddFieldFormOpen] = useState(false);
  const [inferredSnapshot, setInferredSnapshot] = useState<TestConfigurationPreviewField[]>([]);
  const [mappedFieldTypes, setMappedFieldTypes] = useState<Record<string, string>>(
    () => field.value ?? {}
  );
  const [seedFieldTypes, setSeedFieldTypes] = useState<Record<string, string>>(
    () => field.value ?? {}
  );
  const latestFieldTypesRef = useRef<Record<string, string>>(field.value ?? {});

  const mappings = useMemo(() => automaticFieldTypesToMappings(seedFieldTypes), [seedFieldTypes]);
  const dynamicItems = useMemo<DynamicFieldRow[]>(
    () =>
      getDynamicInferredFields(inferredSnapshot, mappedFieldTypes).map((dynamicField) => ({
        id: dynamicField.name,
        name: dynamicField.name,
        type: dynamicField.type ?? 'keyword',
      })),
    [inferredSnapshot, mappedFieldTypes]
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
      setMappedFieldTypes(nextFieldTypes);
      debouncedSyncToForm(nextFieldTypes);
    },
    [debouncedSyncToForm]
  );

  const applyFieldTypes = useCallback(
    (nextFieldTypes: Record<string, string>) => {
      debouncedSyncToForm.cancel();
      latestFieldTypesRef.current = nextFieldTypes;
      field.onChange(nextFieldTypes);
      setMappedFieldTypes(nextFieldTypes);
      setSeedFieldTypes(nextFieldTypes);
      setSchemaEditorKey((currentKey) => currentKey + 1);
    },
    [debouncedSyncToForm, field]
  );

  const handleInferSchema = useCallback(() => {
    setInferredSnapshot([...inferredFields]);
  }, [inferredFields]);

  const handleMapField = useCallback(
    (name: string, type: string) => {
      applyFieldTypes({
        ...latestFieldTypesRef.current,
        [name]: type,
      });
    },
    [applyFieldTypes]
  );

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

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const setupAddFieldButton = (): boolean => {
      const addFieldButton = root.querySelector<HTMLElement>('[data-test-subj="addFieldButton"]');
      if (!addFieldButton) {
        return false;
      }

      addFieldButtonRef.current = addFieldButton;
      return true;
    };

    if (setupAddFieldButton()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (setupAddFieldButton()) {
        observer.disconnect();
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [schemaEditorKey]);

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
      <div data-test-subj="datasetWizardMappedFields">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{datasetWizardStrings.mappedFieldsTitle()}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <MappedFieldsEditorComponent
          key={schemaEditorKey}
          value={mappings}
          compressed
          fieldEditDisplay="inline"
          onChange={onMappingsChange}
        />
      </div>

      <EuiSpacer size="xl" />

      <div data-test-subj="datasetWizardDynamicFields">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>{datasetWizardStrings.dynamicFieldsTitle()}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={datasetWizardStrings.dynamicFieldsEnabledToggle()}
                  checked={isDynamicEnabled}
                  onChange={(event) => {
                    dynamicFieldsEnabledField.onChange(event.target.checked);
                  }}
                  data-test-subj="datasetWizardDynamicFieldsEnabled"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="indexMapping"
              color="text"
              size="s"
              data-test-subj="datasetWizardInferSchema"
              onClick={handleInferSchema}
            >
              {datasetWizardStrings.inferSchemaButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText
          size="s"
          color="subdued"
          data-test-subj={
            isDynamicEnabled
              ? 'datasetWizardDynamicFieldsEmpty'
              : 'datasetWizardDynamicFieldsDisabled'
          }
        >
          <p>
            {isDynamicEnabled
              ? datasetWizardStrings.dynamicFieldsEmpty()
              : datasetWizardStrings.dynamicFieldsDisabled()}
          </p>
        </EuiText>
        {dynamicItems.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <DynamicFieldsTable items={dynamicItems} onMapField={handleMapField} />
          </>
        ) : null}
      </div>
    </div>
  );
};
