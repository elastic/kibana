/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Streams } from '@kbn/streams-schema';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';
import { SchemaEditorFlyout } from './flyout';
import { useSchemaEditorContext } from './schema_editor_context';
import type { SchemaField } from './types';
import { useKibana } from '../../../hooks/use_kibana';
import { getGeoPointSuggestion } from './utils';

export const FieldActionsCell = ({ field }: { field: SchemaField }) => {
  const context = useKibana();
  const schemaEditorContext = useSchemaEditorContext();

  const { core } = context;

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'fieldsTableContextMenuPopover',
  });

  const [popoverIsOpen, { off: closePopover, toggle }] = useBoolean(false);

  const panels = useMemo(() => {
    const {
      onFieldUpdate,
      onAddField,
      stream,
      withFieldSimulation,
      fields,
      enableGeoPointSuggestions,
    } = schemaEditorContext;

    let actions = [];

    const openFlyout = (
      props: { isEditingByDefault?: boolean; applyGeoPointSuggestion?: boolean } = {},
      targetField: SchemaField = field
    ) => {
      if (!Streams.ingest.all.Definition.is(stream)) {
        return;
      }
      const overlay = core.overlays.openFlyout(
        toMountPoint(
          <StreamsAppContextProvider context={context}>
            <SchemaEditorFlyout
              field={targetField}
              onClose={() => overlay.close()}
              onStage={(stagedField) => {
                const exists = fields.some((f) => f.name === stagedField.name);
                if (exists) {
                  onFieldUpdate(stagedField);
                } else if (onAddField) {
                  onAddField(stagedField);
                } else {
                  onFieldUpdate(stagedField);
                }
              }}
              stream={stream}
              withFieldSimulation={withFieldSimulation}
              fields={fields}
              enableGeoPointSuggestions={enableGeoPointSuggestions}
              onGoToField={handleGoToField}
              {...props}
            />
          </StreamsAppContextProvider>,
          core
        ),
        { maxWidth: 500 }
      );

      function handleGoToField(fieldName: string) {
        overlay.close();
        const targetFieldObj = fields.find((f) => f.name === fieldName);
        if (targetFieldObj) {
          openFlyout({}, targetFieldObj);
        }
      }
    };

    const clearDescriptionAction = {
      name: i18n.translate('xpack.streams.actions.clearDescriptionLabel', {
        defaultMessage: 'Clear description',
      }),
      onClick: () => {
        const { description, ...fieldWithoutDescription } = field;
        onFieldUpdate(fieldWithoutDescription as SchemaField);
      },
    };

    const viewFieldAction = {
      name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
        defaultMessage: 'View field',
      }),
      onClick: () => openFlyout(),
    };

    const editFieldAction = {
      name: i18n.translate('xpack.streams.actions.editFieldLabel', {
        defaultMessage: 'Edit field',
      }),
      onClick: () => openFlyout({ isEditingByDefault: true }),
    };

    // Check if this field has a real ES mapping in a parent stream.
    const inheritedField = fields.find((f) => f.name === field.name && f.status === 'inherited');
    const hasRealMappingInParent = Boolean(inheritedField?.type);
    // For "Unmap" action, we need to know if there's ANY inherited entry
    const isInheritedFromParent = !!inheritedField;

    switch (field.status) {
      case 'mapped':
        actions = [viewFieldAction, editFieldAction];
        if (field.description) {
          actions.push(clearDescriptionAction);
        }
        // Don't show "Unmap field" for:
        // - Fields inherited from parent (the parent's mapping or documentation still applies)
        // - Documentation-only fields (no type) since there's nothing to unmap
        if (!isInheritedFromParent && field.type) {
          actions.push({
            name: i18n.translate('xpack.streams.actions.unpromoteFieldLabel', {
              defaultMessage: 'Unmap field',
            }),
            onClick: () => {
              onFieldUpdate({
                name: field.name,
                parent: field.parent,
                status: 'unmapped',
                ...(Streams.WiredStream.Definition.is(stream) && field.description
                  ? { description: field.description }
                  : {}),
              } as SchemaField);
            },
          });
        }
        break;
      case 'unmapped':
        actions = [viewFieldAction];
        // Only show "Edit field" if the parent doesn't have a real ES mapping (type !== 'unmapped')
        // If the parent has a real mapping, the child can't map it differently
        if (!hasRealMappingInParent) {
          actions.push({
            name: i18n.translate('xpack.streams.actions.editFieldLabel', {
              defaultMessage: 'Edit field',
            }),
            onClick: () => openFlyout({ isEditingByDefault: true }),
          });
        } else {
          // If parent has real mapping, only allow editing description
          actions.push(editFieldAction);
        }
        if (field.description) {
          actions.push(clearDescriptionAction);
        }

        if (enableGeoPointSuggestions !== false && !hasRealMappingInParent) {
          const geoSuggestion = getGeoPointSuggestion({
            fieldName: field.name,
            fields,
            streamType: Streams.WiredStream.Definition.is(stream) ? 'wired' : 'classic',
          });

          if (geoSuggestion) {
            actions.push({
              name: i18n.translate('xpack.streams.actions.mapAsGeoFieldLabel', {
                defaultMessage: 'Map as geo field',
              }),
              onClick: () =>
                openFlyout({ isEditingByDefault: true, applyGeoPointSuggestion: true }),
            });
          }
        }
        break;
      case 'inherited':
        actions = [viewFieldAction, editFieldAction];
        if (field.description) {
          actions.push(clearDescriptionAction);
        }
        break;
    }

    return [
      {
        id: 0,
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle', {
          defaultMessage: 'Field actions',
        }),
        items: actions.map((action) => ({
          name: action.name,
          onClick: () => {
            action.onClick();
            closePopover();
          },
        })),
      },
    ];
  }, [closePopover, context, core, field, schemaEditorContext]);

  if (field.type === 'system') {
    return null;
  }

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTriggerButton',
            { defaultMessage: 'Open actions menu' }
          )}
          data-test-subj="streamsAppActionsButton"
          iconType="boxesVertical"
          onClick={toggle}
        />
      }
      isOpen={popoverIsOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
