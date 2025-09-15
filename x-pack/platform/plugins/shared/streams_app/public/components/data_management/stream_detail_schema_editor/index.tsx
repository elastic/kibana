/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBottomBar, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Streams, isRootStreamDefinition } from '@kbn/streams-schema';
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from '../../../hooks/use_kibana';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { SchemaEditor } from '../schema_editor';
import { SUPPORTED_TABLE_COLUMN_NAMES } from '../schema_editor/constants';
import { useSchemaFields } from '../schema_editor/hooks/use_schema_fields';
import { SchemaChangesReviewModal } from '../schema_editor/schema_changes_review_modal';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';

interface SchemaEditorProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

const wiredDefaultColumns = SUPPORTED_TABLE_COLUMN_NAMES;
const classicDefaultColumns = SUPPORTED_TABLE_COLUMN_NAMES.filter((column) => column !== 'parent');

export const StreamDetailSchemaEditor = ({ definition, refreshDefinition }: SchemaEditorProps) => {
  const context = useKibana();
  const { loading } = useStreamDetail();

  const {
    fields,
    storedFields,
    isLoadingFields,
    refreshFields,
    updateField,
    pendingChangesCount,
    discardChanges,
    submitChanges,
  } = useSchemaFields({
    definition,
    refreshDefinition,
  });

  const handleCancelClick = useDiscardConfirm(discardChanges, {
    defaultFocusedButton: 'cancel',
  });

  const openConfirmationModal = () => {
    const overlay = context.core.overlays.openModal(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <SchemaChangesReviewModal
            fields={fields}
            stream={definition.stream.name}
            storedFields={storedFields}
            submitChanges={submitChanges}
            onClose={() => overlay.close()}
          />
        </StreamsAppContextProvider>,
        context.core
      ),
      {
        maxWidth: 500,
      }
    );
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
      <EuiFlexItem grow={1} css={{ minHeight: 0 }}>
        <SchemaEditor
          fields={fields}
          isLoading={loading || isLoadingFields}
          defaultColumns={
            Streams.WiredStream.GetResponse.is(definition)
              ? wiredDefaultColumns
              : classicDefaultColumns
          }
          stream={definition.stream}
          onFieldUpdate={updateField}
          onRefreshData={refreshFields}
          withControls
          withFieldSimulation
          withTableActions={
            !isRootStreamDefinition(definition.stream) && definition.privileges.manage
          }
        />
      </EuiFlexItem>
      {pendingChangesCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBottomBar position="static">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="xpack.streams.schemaEditor.changesPendingLabel"
                  defaultMessage="{count, plural, one {# change pending. Review and submit when ready.} other {# changes pending. Review and submit when ready.}}"
                  values={{ count: pendingChangesCount }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="text" onClick={handleCancelClick}>
                      <FormattedMessage
                        id="xpack.streams.schemaEditor.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton fill onClick={openConfirmationModal}>
                      <FormattedMessage
                        id="xpack.streams.schemaEditor.submitChangesButtonLabel"
                        defaultMessage="Submit changes"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
