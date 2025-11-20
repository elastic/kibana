/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiToolTipProps, EuiButtonEmptyProps } from '@elastic/eui';
import { EuiFlexGroup, EuiButton, EuiButtonEmpty, EuiToolTip, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { StreamDeleteModal } from '../../stream_delete_modal';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import type { RoutingDefinitionWithUIAttributes } from './types';

export const AddRoutingRuleControls = () => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges, forkStream } = useStreamRoutingEvents();

  const isForking = routingSnapshot.matches({ ready: { creatingNewRule: 'forking' } });
  const canForkRouting = routingSnapshot.can({ type: 'routingRule.fork' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center" wrap responsive={false}>
      <CancelButton isDisabled={isForking} onClick={cancelChanges} />
      <PrivilegesTooltip hasPrivileges={hasPrivileges}>
        <SaveButton
          isLoading={isForking}
          isDisabled={!canForkRouting}
          onClick={() => forkStream()}
        />
      </PrivilegesTooltip>
    </EuiFlexGroup>
  );
};

export const EditRoutingRuleControls = ({
  routingRule,
}: {
  routingRule: RoutingDefinitionWithUIAttributes;
}) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges, removeRule, saveChanges } = useStreamRoutingEvents();

  const routingRuleName = routingRule.destination;

  const isUpdating = routingSnapshot.matches({ ready: { editingRule: 'updatingRule' } });

  const canUpdateRouting = routingSnapshot.can({ type: 'routingRule.save' });
  const canRemoveRoutingRule = routingSnapshot.can({ type: 'routingRule.remove' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
      <RemoveButton
        onDelete={removeRule}
        isDisabled={!canRemoveRoutingRule}
        streamName={routingRuleName}
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" wrap>
          <CancelButton isDisabled={isUpdating} onClick={cancelChanges} />
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
  );
};

export const EditSuggestedRuleControls = ({
  onSave,
  onAccept,
  nameError,
  conditionError,
}: {
  onSave?: () => void;
  onAccept: () => void;
  nameError?: string;
  conditionError?: string;
}) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges } = useStreamRoutingEvents();

  const canSave = routingSnapshot.can({ type: 'suggestion.saveSuggestion' });
  const hasPrivileges = routingSnapshot.context.definition.privileges.manage;

  const hasValidationErrors = !!nameError || !!conditionError;
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
            isDisabled={isUpdateDisabled}
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
        color="danger"
        size="s"
        data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
        isDisabled={isDisabled}
        onClick={openDeleteModal}
      >
        {i18n.translate('xpack.streams.streamDetailRouting.remove', {
          defaultMessage: 'Remove',
        })}
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
