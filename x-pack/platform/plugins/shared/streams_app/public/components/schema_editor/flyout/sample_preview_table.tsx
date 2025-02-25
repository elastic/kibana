/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { WiredStreamDefinition } from '@kbn/streams-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { PreviewTable } from '../../preview_table';
import { LoadingPanel } from '../../loading_panel';
import { MappedSchemaField, SchemaField, isSchemaFieldTyped } from '../types';
import { convertToFieldDefinitionConfig } from '../utils';

interface SamplePreviewTableProps {
  stream: WiredStreamDefinition;
  nextField: SchemaField;
}

export const SamplePreviewTable = (props: SamplePreviewTableProps) => {
  const { nextField, ...rest } = props;
  if (isSchemaFieldTyped(nextField)) {
    return <SamplePreviewTableContent nextField={nextField} {...rest} />;
  } else {
    return null;
  }
};

const SAMPLE_DOCUMENTS_TO_SHOW = 20;

const SamplePreviewTableContent = ({
  stream,
  nextField,
}: SamplePreviewTableProps & { nextField: MappedSchemaField }) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('POST /api/streams/{name}/schema/fields_simulation', {
        signal,
        params: {
          path: {
            name: stream.name,
          },
          body: {
            field_definitions: [
              { ...convertToFieldDefinitionConfig(nextField), name: nextField.name },
            ],
          },
        },
      });
    },
    [stream.name, nextField, streamsRepositoryClient],
    { disableToastOnError: true }
  );

  const columns = useMemo(() => {
    return [nextField.name];
  }, [nextField.name]);

  if (loading) {
    return <LoadingPanel />;
  }

  if (
    value &&
    (value.status === 'unknown' || value.documentsWithRuntimeFieldsApplied?.length === 0)
  ) {
    return (
      <EuiCallOut>
        {i18n.translate('xpack.streams.samplePreviewTable.unknownStatus', {
          defaultMessage:
            "Couldn't simulate changes due to a lack of indexed documents with this field",
        })}
      </EuiCallOut>
    );
  }

  if ((value && value.status === 'failure') || error) {
    const formattedError = error && getFormattedError(error);
    return (
      <EuiCallOut
        color="danger"
        title={i18n.translate('xpack.streams.samplePreviewTable.errorTitle', {
          defaultMessage:
            'There was an error simulating these mapping changes with a sample of documents',
        })}
      >
        {value?.simulationError ?? formattedError?.message}
      </EuiCallOut>
    );
  }

  if (value && value.status === 'success' && value.documentsWithRuntimeFieldsApplied) {
    return (
      <div
        css={css`
          height: 500px;
        `}
      >
        <PreviewTable
          documents={value.documentsWithRuntimeFieldsApplied.slice(0, SAMPLE_DOCUMENTS_TO_SHOW)}
          displayColumns={columns}
        />
      </div>
    );
  }

  return null;
};
