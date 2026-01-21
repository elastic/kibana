/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep, isEqual } from 'lodash';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { EditableConditionPanel } from '../../data_management/shared';
import { SystemEventsData } from './system_events_data';
import { useStreamSystemsApi } from '../../../hooks/use_stream_systems_api';

export const StreamSystemDetailsFlyout = ({
  system,
  definition,
  closeFlyout,
  refreshSystems,
}: {
  system: System;
  definition: Streams.all.Definition;
  closeFlyout: () => void;
  refreshSystems: () => void;
}) => {
  const [updatedSystem, setUpdatedSystem] = React.useState<System>(cloneDeep(system));
  const { upsertSystem } = useStreamSystemsApi(definition);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEditingCondition, toggleIsEditingCondition] = useToggle(false);

  const updateSystem = () => {
    setIsUpdating(true);
    upsertSystem(updatedSystem).finally(() => {
      setIsUpdating(false);
      refreshSystems();
      closeFlyout();
    });
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.systemDetails.flyoutAriaLabel', {
        defaultMessage: 'System details',
      })}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{updatedSystem.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.description', {
                defaultMessage: 'Description',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiMarkdownEditor
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.systemDetailExpanded.markdownEditorAriaLabel',
              {
                defaultMessage: 'System description markdown editor',
              }
            )}
            value={updatedSystem.description}
            onChange={(value) => setUpdatedSystem({ ...updatedSystem, description: value })}
            height={320}
            readOnly={false}
            initialViewMode="viewing"
            autoExpandPreview={false}
          />
          <EuiHorizontalRule />
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexGroup justifyContent="flexStart" gutterSize="xs" alignItems="center">
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.filter', {
                    defaultMessage: 'Filter',
                  })}
                </h3>
              </EuiTitle>
              <EuiButtonIcon
                iconType="pencil"
                onClick={toggleIsEditingCondition}
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.systemDetailExpanded.filter.edit',
                  {
                    defaultMessage: 'Edit filter',
                  }
                )}
                data-test-subj={
                  isEditingCondition
                    ? 'system_identification_existing_edit_filter_button'
                    : 'system_identification_existing_save_filter_button'
                }
              />
            </EuiFlexGroup>
            <EditableConditionPanel
              condition={updatedSystem.filter}
              isEditingCondition={isEditingCondition}
              setCondition={(condition) =>
                setUpdatedSystem({ ...updatedSystem, filter: condition })
              }
            />
          </EuiFlexGroup>
          <EuiHorizontalRule />
          <SystemEventsData system={updatedSystem} definition={definition} />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isUpdating}
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('xpack.streams.systemDetails.closeButtonAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
              data-test-subj="system_identification_existing_cancel_edit_button"
            >
              <FormattedMessage
                id="xpack.streams.systemDetails.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isUpdating}
              onClick={updateSystem}
              fill
              isDisabled={isEqual(system, updatedSystem)}
              data-test-subj="system_identification_existing_save_changes_button"
            >
              <FormattedMessage
                id="xpack.streams.systemDetails.saveChanges"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
