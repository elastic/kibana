/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type {
  FindFileStructureResponse,
  IngestPipeline,
} from '@kbn/file-upload-plugin/common/types';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiButton,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextAlign,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloneDeep } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import type {
  InferenceInferenceEndpointInfo,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createSemanticTextCombinedField, getFieldNames, getNameCollisionMsg } from './utils';
import { useDataVisualizerKibana } from '../../../kibana_context';
import type { AddCombinedField } from './combined_fields_form';

interface Props {
  addCombinedField: AddCombinedField;
  hasNameCollision: (name: string) => boolean;
  results: FindFileStructureResponse;
}
export const SemanticTextForm: FC<Props> = ({ addCombinedField, hasNameCollision, results }) => {
  const {
    services: { http },
  } = useDataVisualizerKibana();
  const [inferenceEndpoints, setInferenceEndpoints] = useState<EuiSelectOption[]>([]);
  const [selectedInferenceEndpoint, setSelectedInferenceEndpoint] = useState<string | undefined>();
  const [selectedFieldOption, setSelectedFieldOption] = useState<string | undefined>();
  const [renameToFieldOption, setRenameToFieldOption] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const fieldOptions = useMemo(
    () =>
      getFieldNames(results).map((columnName: string) => {
        return { value: columnName, text: columnName };
      }),
    [results]
  );

  useEffect(() => {
    setSelectedFieldOption(fieldOptions[0].value ?? null);
  }, [fieldOptions]);

  useEffect(() => {
    http
      .fetch<InferenceInferenceEndpointInfo[]>('/internal/data_visualizer/inference_endpoints', {
        method: 'GET',
        version: '1',
      })
      .then((response) => {
        const inferenceEndpointOptions = response.map((endpoint) => ({
          value: endpoint.inference_id,
          text: endpoint.inference_id,
        }));
        setInferenceEndpoints(inferenceEndpointOptions);
        setSelectedInferenceEndpoint(inferenceEndpointOptions[0]?.value ?? undefined);
      });
  }, [http]);

  useEffect(() => {
    if (selectedFieldOption?.includes('.')) {
      setRenameToFieldOption(selectedFieldOption.split('.').pop()!);
    } else {
      setRenameToFieldOption(`${selectedFieldOption}_semantic`);
    }
  }, [selectedFieldOption]);

  const onSubmit = () => {
    if (
      renameToFieldOption === '' ||
      renameToFieldOption === undefined ||
      selectedFieldOption === undefined ||
      selectedInferenceEndpoint === undefined
    ) {
      return;
    }
    addCombinedField(
      createSemanticTextCombinedField(renameToFieldOption, selectedFieldOption),
      (mappings: MappingTypeMapping) => {
        if (renameToFieldOption === undefined || selectedFieldOption === undefined) {
          return mappings;
        }

        const newMappings = cloneDeep(mappings);
        newMappings.properties![renameToFieldOption ?? selectedFieldOption] = {
          // @ts-ignore types are missing semantic_text
          type: 'semantic_text',
          inference_id: selectedInferenceEndpoint,
        };
        return newMappings;
      },
      (pipeline: IngestPipeline) => {
        const newPipeline = cloneDeep(pipeline);
        if (renameToFieldOption !== null) {
          newPipeline.processors.push({
            set: {
              field: renameToFieldOption,
              copy_from: selectedFieldOption,
            },
          });
        }
        return newPipeline;
      }
    );
  };

  useDebounce(
    () => {
      if (renameToFieldOption === undefined) {
        return;
      }
      const error = hasNameCollision(renameToFieldOption)
        ? getNameCollisionMsg(renameToFieldOption)
        : undefined;
      setFieldError(error);
    },
    250,
    [renameToFieldOption]
  );

  const isInvalid = useMemo(() => {
    return (
      !selectedInferenceEndpoint ||
      !selectedFieldOption ||
      renameToFieldOption === '' ||
      fieldError !== undefined
    );
  }, [selectedInferenceEndpoint, selectedFieldOption, renameToFieldOption, fieldError]);

  return (
    <>
      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.fieldLabel', {
          defaultMessage: 'Field',
        })}
      >
        <EuiSelect
          options={fieldOptions}
          value={selectedFieldOption}
          onChange={(e) => setSelectedFieldOption(e.target.value)}
        />
      </EuiFormRow>

      {renameToFieldOption !== null ? (
        <EuiFormRow
          label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.copyFieldLabel', {
            defaultMessage: 'Copy to field',
          })}
          isInvalid={fieldError !== undefined}
          error={[fieldError]}
        >
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.dataVisualizer.file.semanticTextForm.copyFieldLabel.placeholder',
              {
                defaultMessage: 'Field name',
              }
            )}
            value={renameToFieldOption}
            onChange={(e) => setRenameToFieldOption(e.target.value)}
            aria-label="field name"
          />
        </EuiFormRow>
      ) : null}

      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.inferenceLabel', {
          defaultMessage: 'Inference endpoint',
        })}
      >
        <EuiSelect
          options={inferenceEndpoints}
          value={selectedInferenceEndpoint}
          onChange={(e) => setSelectedInferenceEndpoint(e.target.value)}
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiTextAlign textAlign="right">
        <EuiButton size="s" fill disabled={isInvalid} onClick={onSubmit}>
          <FormattedMessage
            id="xpack.dataVisualizer.file.geoPointForm.submitButtonLabel"
            defaultMessage="Add"
          />
        </EuiButton>
      </EuiTextAlign>
    </>
  );
};
