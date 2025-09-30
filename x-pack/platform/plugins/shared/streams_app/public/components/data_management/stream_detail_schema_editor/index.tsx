/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Streams, isRootStreamDefinition } from '@kbn/streams-schema';
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { SchemaEditor } from '../schema_editor';
import { SUPPORTED_TABLE_COLUMN_NAMES } from '../schema_editor/constants';
import { getDefinitionFields, useSchemaFields } from '../schema_editor/hooks/use_schema_fields';
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
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);

  const {
    fields,
    isLoadingFields,
    refreshFields,
    addField,
    updateField,
    pendingChangesCount,
    discardChanges,
    submitChanges,
  } = useSchemaFields({
    definition,
    refreshDefinition,
  });
  const definitionFields = React.useMemo(() => getDefinitionFields(definition), [definition]);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: pendingChangesCount > 0,
    history: context.appParams.history,
    http: context.core.http,
    navigateToUrl: context.core.application.navigateToUrl,
    openConfirm: context.core.overlays.openConfirm,
    shouldPromptOnReplace: false,
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
            definition={definition}
            storedFields={definitionFields}
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

  const isRootStream = isRootStreamDefinition(definition.stream);
  const handleAddField = !isRootStream && definition.privileges.manage ? addField : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
      {isRootStream && (
        <>
          <EuiCallOut
            iconType="info"
            title={i18n.translate('xpack.streams.schemaEditor.rootStreamReadOnlyMode', {
              defaultMessage:
                'Root streams are selectively immutable and their schema cannot be modified. To modify the schema or to add processing steps, partition a new child stream first.',
            })}
            announceOnMount={false}
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}
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
          onAddField={handleAddField}
          onFieldUpdate={updateField}
          onRefreshData={refreshFields}
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
          withFieldSimulation
          withTableActions={!isRootStream && definition.privileges.manage}
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
                    <EuiButtonEmpty
                      color="text"
                      onClick={handleCancelClick}
                      data-test-subj="streamsAppSchemaEditorDiscardChangesButton"
                    >
                      <FormattedMessage
                        id="xpack.streams.schemaEditor.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={openConfirmationModal}
                      data-test-subj="streamsAppSchemaEditorReviewStagedChangesButton"
                    >
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
