/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  EuiToolTipProps,
  EuiButtonEmptyProps,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { StreamDeleteModal } from '../../stream_delete_modal';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { RoutingDefinitionWithUIAttributes } from './types';

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
        <SaveButton isLoading={isForking} isDisabled={!canForkRouting} onClick={forkStream} />
      </PrivilegesTooltip>
    </EuiFlexGroup>
  );
};

export const EditRoutingRuleControls = ({
  relatedStreams,
  routingRule,
}: {
  relatedStreams: string[];
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
        relatedStreams={relatedStreams}
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

const RemoveButton = ({
  isDisabled,
  onDelete,
  relatedStreams,
  streamName,
}: {
  isDisabled: boolean;
  onDelete: () => Promise<void>;
  relatedStreams: string[];
  streamName: string;
}) => {
  const [isDeleteModalOpen, { on: openDeleteModal, off: closeDeleteModal }] = useBoolean(false);

  return (
    <>
      <EuiButtonEmpty
        color="danger"
        size="s"
        data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
        isDisabled={isDisabled}
        onClick={openDeleteModal}
      >
        {i18n.translate('xpack.streams.streamDetailRouting.remove', {
          defaultMessage: 'Remove',
        })}
      </EuiButtonEmpty>
      {isDeleteModalOpen && (
        <StreamDeleteModal
          onClose={closeDeleteModal}
          onCancel={closeDeleteModal}
          onDelete={onDelete}
          name={streamName}
          relatedStreams={relatedStreams}
        />
      )}
    </>
  );
};

const SaveButton = (props: EuiButtonPropsForButton) => (
  <EuiButton data-test-subj="streamsAppStreamDetailRoutingSaveButton" {...props}>
    {i18n.translate('xpack.streams.streamDetailRouting.add', {
      defaultMessage: 'Save',
    })}
  </EuiButton>
);

const UpdateButton = (props: EuiButtonPropsForButton) => (
  <EuiButton data-test-subj="streamsAppStreamDetailRoutingUpdateButton" {...props}>
    {i18n.translate('xpack.streams.streamDetailRouting.change', {
      defaultMessage: 'Change routing',
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
