/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmptyProps, EuiToolTipProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import { StreamDeleteModal } from '../../stream_delete_modal';
import { RequestPreviewFlyout } from '../request_preview_flyout';
import { buildRequestPreviewCodeContent } from '../shared/utils';
import {
  selectCurrentRule,
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import type { RoutingDefinitionWithUIAttributes } from './types';
import {
  buildRoutingForkRequestPayload,
  buildRoutingSaveRequestPayload,
  routingConverter,
} from './utils';

interface AddRoutingRuleControlsProps {
  isStreamNameValid: boolean;
}

export const AddRoutingRuleControls = ({ isStreamNameValid }: AddRoutingRuleControlsProps) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges, forkStream } = useStreamRoutingEvents();
  const [isRequestPreviewFlyoutOpen, setIsRequestPreviewFlyoutOpen] = React.useState(false);
  const [requestPreviewCodeContent, setRequestPreviewCodeContent] = React.useState<string>('');

  const onViewCodeClick = () => {
    const currentRoutingRule = selectCurrentRule(routingSnapshot.context);
    const body = buildRoutingForkRequestPayload({
      where: currentRoutingRule.where,
      destination: currentRoutingRule.destination,
      status: currentRoutingRule.status,
    });
    setRequestPreviewCodeContent(
      buildRequestPreviewCodeContent({
        method: 'POST',
        url: `/api/streams/${routingSnapshot.context.definition.stream.name}/_fork`,
        body,
      })
    );
    setIsRequestPreviewFlyoutOpen(true);
  };

  const closeRequestPreviewFlyout = () => {
    setIsRequestPreviewFlyoutOpen(false);
    setRequestPreviewCodeContent('');
  };

  const isForking = routingSnapshot.matches({ ready: { creatingNewRule: 'forking' } });
  const canForkRouting = routingSnapshot.can({ type: 'routingRule.fork' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="streamsAppRoutingAddRoutingRuleViewCodeButton"
            size="s"
            iconType="editorCodeBlock"
            onClick={onViewCodeClick}
          >
            {viewCodeButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" wrap responsive={false}>
            <CancelButton isDisabled={isForking} onClick={cancelChanges} />
            <PrivilegesTooltip hasPrivileges={hasPrivileges}>
              <SaveButton
                isLoading={isForking}
                isDisabled={!canForkRouting || !isStreamNameValid}
                onClick={() => forkStream()}
              />
            </PrivilegesTooltip>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isRequestPreviewFlyoutOpen && (
        <RequestPreviewFlyout
          codeContent={requestPreviewCodeContent}
          onClose={closeRequestPreviewFlyout}
        />
      )}
    </>
  );
};

export const EditRoutingRuleControls = ({
  routingRule,
}: {
  routingRule: RoutingDefinitionWithUIAttributes;
}) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges, removeRule, saveChanges } = useStreamRoutingEvents();
  const [isRequestPreviewFlyoutOpen, setIsRequestPreviewFlyoutOpen] = React.useState(false);
  const [requestPreviewCodeContent, setRequestPreviewCodeContent] = React.useState<string>('');

  const onViewCodeClick = () => {
    const routing = routingSnapshot.context.routing.map(routingConverter.toAPIDefinition);
    const body = buildRoutingSaveRequestPayload(routingSnapshot.context.definition, routing);

    setRequestPreviewCodeContent(
      buildRequestPreviewCodeContent({
        method: 'PUT',
        url: `/api/streams/${routingSnapshot.context.definition.stream.name}/_ingest`,
        body,
      })
    );
    setIsRequestPreviewFlyoutOpen(true);
  };

  const closeRequestPreviewFlyout = () => {
    setIsRequestPreviewFlyoutOpen(false);
    setRequestPreviewCodeContent('');
  };

  const routingRuleName = routingRule.destination;

  const isUpdating = routingSnapshot.matches({ ready: { editingRule: 'updatingRule' } });

  const canUpdateRouting = routingSnapshot.can({ type: 'routingRule.save' });
  const canRemoveRoutingRule = routingSnapshot.can({ type: 'routingRule.remove' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <RemoveButton
            onDelete={removeRule}
            isDisabled={!canRemoveRoutingRule}
            streamName={routingRuleName}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
            <CancelButton isDisabled={isUpdating} onClick={cancelChanges} />
            <EuiToolTip position="top" content={viewCodeButtonLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="streamsAppRoutingEditRoutingRuleViewCodeButton"
                aria-label={viewCodeButtonLabel}
                size="s"
                iconType="editorCodeBlock"
                display="base"
                onClick={onViewCodeClick}
              />
            </EuiToolTip>
            <PrivilegesTooltip hasPrivileges={hasPrivileges}>
              <UpdateButton
                isLoading={isUpdating}
                isDisabled={!canUpdateRouting}
                onClick={saveChanges}
              />
            </PrivilegesTooltip>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isRequestPreviewFlyoutOpen && (
        <RequestPreviewFlyout
          codeContent={requestPreviewCodeContent}
          onClose={closeRequestPreviewFlyout}
        />
      )}
    </>
  );
};

export const EditSuggestedRuleControls = ({
  onSave,
  onAccept,
  conditionError,
  isStreamNameValid,
}: {
  onSave?: () => void;
  onAccept: () => void;
  conditionError?: string;
  isStreamNameValid: boolean;
}) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges } = useStreamRoutingEvents();

  const canSave = routingSnapshot.can({ type: 'suggestion.saveSuggestion' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  const hasValidationErrors = !!conditionError;
  const isUpdateDisabled = hasValidationErrors || !canSave;

  const handleAccept = () => {
    if (onSave) {
      onSave();
    }
    onAccept();
  };

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
      <EuiFlexItem grow={false}>
        <CancelButton onClick={cancelChanges} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <PrivilegesTooltip hasPrivileges={hasPrivileges}>
          <UpdateAndAcceptButton
            isLoading={false}
            isDisabled={isUpdateDisabled || !isStreamNameValid}
            onClick={handleAccept}
          />
        </PrivilegesTooltip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RemoveButton = ({
  isDisabled,
  onDelete,
  streamName,
}: {
  isDisabled: boolean;
  onDelete: () => Promise<void>;
  streamName: string;
}) => {
  const [isDeleteModalOpen, { on: openDeleteModal, off: closeDeleteModal }] = useBoolean(false);

  return (
    <>
      <EuiButton
        data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
        color="danger"
        size="s"
        isDisabled={isDisabled}
        onClick={openDeleteModal}
      >
        {removeButtonLabel}
      </EuiButton>
      {isDeleteModalOpen && (
        <StreamDeleteModal
          onClose={closeDeleteModal}
          onCancel={closeDeleteModal}
          onDelete={onDelete}
          name={streamName}
        />
      )}
    </>
  );
};

const SaveButton = (props: EuiButtonPropsForButton) => (
  <EuiButton data-test-subj="streamsAppStreamDetailRoutingSaveButton" size="s" fill {...props}>
    {i18n.translate('xpack.streams.streamDetailRouting.add', {
      defaultMessage: 'Save',
    })}
  </EuiButton>
);

const UpdateButton = (props: EuiButtonPropsForButton) => (
  <EuiButton data-test-subj="streamsAppStreamDetailRoutingUpdateButton" size="s" fill {...props}>
    {i18n.translate('xpack.streams.streamDetailRouting.update', {
      defaultMessage: 'Update',
    })}
  </EuiButton>
);

const UpdateAndAcceptButton = (props: EuiButtonPropsForButton) => (
  <EuiButton
    data-test-subj="streamsAppStreamDetailRoutingUpdateAndAcceptButton"
    size="s"
    fill
    {...props}
  >
    {i18n.translate('xpack.streams.streamDetailRouting.updateAndAccept', {
      defaultMessage: 'Update & Accept',
    })}
  </EuiButton>
);

const CancelButton = (props: EuiButtonEmptyProps) => (
  <EuiButtonEmpty size="s" data-test-subj="streamsAppRoutingStreamEntryCancelButton" {...props}>
    {i18n.translate('xpack.streams.streamDetailRouting.cancel', {
      defaultMessage: 'Cancel',
    })}
  </EuiButtonEmpty>
);

const PrivilegesTooltip = ({
  children,
  hasPrivileges,
}: {
  children: EuiToolTipProps['children'];
  hasPrivileges: boolean;
}) => (
  <EuiToolTip
    content={
      !hasPrivileges
        ? i18n.translate('xpack.streams.streamDetailRouting.onlySimulate', {
            defaultMessage: "You don't have sufficient privileges to save changes.",
          })
        : undefined
    }
  >
    {children}
  </EuiToolTip>
);

const viewCodeButtonLabel = i18n.translate(
  'xpack.streams.editRoutingRuleControls.viewCodeButtonLabel',
  { defaultMessage: 'View API request' }
);

const removeButtonLabel = i18n.translate(
  'xpack.streams.editRoutingRuleControls.removeButtonLabel',
  {
    defaultMessage: 'Remove',
  }
);
