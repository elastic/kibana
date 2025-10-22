/*
 * Cimport React, { useMemo } from 'react';
import { useEuiTheme, EuiEmptyPrompt, EuiText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Streams } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import {
  convertUIStepsToDSL,
  validateTypes,
  ConditionalTypeChangeError,
  AssumptionConflictError,
} from '@kbn/streamlang';
import { AssetImage } from '../../asset_image';
import { SchemaEditor } from '../schema_editor';
import type { SchemaField } from '../schema_editor/types';lasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Streams } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import { convertUIStepsToDSL, validateTypes } from '@kbn/streamlang';
import { AssetImage } from '../../asset_image';
import { SchemaEditor } from '../schema_editor';
import type { SchemaField } from '../schema_editor/types';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { isSelectableField } from '../schema_editor/schema_editor_table';
import { getConfiguredSteps } from './state_management/stream_enrichment_state_machine/utils';
import { useSchemaFields } from '../schema_editor/hooks/use_schema_fields';

interface DetectedFieldsEditorProps {
  detectedFields: SchemaField[];
}

export const DetectedFieldsEditor = ({ detectedFields }: DetectedFieldsEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const { mapField, unmapField } = useStreamEnrichmentEvents();
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);

  const { fields } = useSchemaFields({ definition, refreshDefinition: () => {} });

  const newSteps = useStreamEnrichmentSelector((state) =>
    convertUIStepsToDSL(getConfiguredSteps(state.context))
  );
  const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
  const [selectedFields, setSelectedFields] = React.useState<string[]>(
    detectedFields
      .filter((field) => isSelectableField(definition.stream.name, field))
      .map(({ name }) => name)
  );

  const hasFields = detectedFields.length > 0;

  const validationResult = useMemo(() => {
    const fieldTypeMap = Object.fromEntries(
      fields.map((field) => [field.name, field.type || 'unknown'])
    );
    // normalize field types

    try {
      return validateTypes(newSteps, fieldTypeMap);
    } catch (e) {
      return e;
    }
  }, [fields, newSteps]);

  if (!hasFields) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        icon={<AssetImage type="noResults" />}
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields.noResults.content',
              {
                defaultMessage: 'No fields were detected. Add fields manually from the Schema tab.',
              }
            )}
          </p>
        }
      />
    );
  }

  return (
    <>
      {isWiredStream && (
        <EuiText
          component="p"
          color="subdued"
          size="xs"
          css={css`
            margin-bottom: ${euiTheme.size.base};
          `}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFieldsHeadline',
            {
              defaultMessage: 'You can review and adjust saved fields further in the Schema tab.',
            }
          )}
        </EuiText>
      )}
      {validationResult instanceof Error && (
        <>
          <TypeValidationError error={validationResult} />
          <EuiSpacer size="m" />
        </>
      )}
      <SchemaEditor
        defaultColumns={['name', 'type', 'format', 'status', 'source']}
        fields={detectedFields}
        stream={definition.stream}
        onFieldUpdate={(field) => {
          if (field.status === 'mapped') {
            mapField(field);
          } else if (field.status === 'unmapped') {
            unmapField(field.name);
          }
        }}
        onFieldSelection={(names, checked) => {
          setSelectedFields((selection) => {
            if (checked) {
              return uniq([...selection, ...names]);
            } else {
              return selection.filter((name) => !names.includes(name));
            }
          });
        }}
        fieldSelection={selectedFields}
        withControls
        withTableActions
      />
    </>
  );
};
