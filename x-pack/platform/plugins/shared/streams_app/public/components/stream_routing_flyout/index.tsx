/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';
import {
  useCanvasEvents,
  type CanvasRoutingFlyout,
} from '../stream_management/data_management/stream_detail_canvas/state_management';
import { RoutingErrorPrompt } from './error_prompt';
import { RoutingRuleList } from './rule_list';
import { discardRoutingChangesPromptOptions } from './prompt_options';
import type {
  RoutingFlyoutActorRef,
  RoutingFlyoutTarget,
  RoutingRuleChanges,
} from './state_management/routing_flyout_machine';

interface RoutingFlyoutProps {
  flyout: CanvasRoutingFlyout;
  /** Called right before the rules are staged, e.g. to record an undo step. */
  onBeforeSave?: () => void;
  /** Whether the user cannot manage the stream; the rules are then shown without editing. */
  readOnly?: boolean;
}

/** Names the line or routing node in the prompt shown when it cannot be configured. */
const getRoutingTargetName = (target: RoutingFlyoutTarget): string => {
  if (target.kind === 'pipeline') {
    return target.pipelineId;
  }
  const { origin, destinationId } = target.line;
  const from =
    origin.kind === 'rule'
      ? `${origin.rule.pipelineId}[${origin.rule.ruleIndex}]`
      : origin.kind === 'source'
      ? origin.id
      : origin.ref.pipelineId;
  return `${from} → ${destinationId}`;
};

export function RoutingFlyout({ flyout, onBeforeSave, readOnly = false }: RoutingFlyoutProps) {
  const { closeRoutingFlyout } = useCanvasEvents();
  const headerId = useGeneratedHtmlId();
  const { ref, target } = flyout;

  if (ref) {
    return (
      <RoutingFlyoutForm
        flyoutRef={ref}
        headerId={headerId}
        onClose={closeRoutingFlyout}
        onBeforeSave={onBeforeSave}
        readOnly={readOnly}
      />
    );
  }
  return (
    <EuiFlyout
      size="m"
      aria-labelledby={headerId}
      onClose={closeRoutingFlyout}
      data-test-subj="streamsRoutingFlyout"
      paddingSize="none"
    >
      <RoutingFlyoutHeader headerId={headerId} isNew={target.kind === 'line'} />
      <EuiFlyoutBody>
        <RoutingErrorPrompt edge={getRoutingTargetName(target)} onClose={closeRoutingFlyout} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

function RoutingFlyoutHeader({
  headerId,
  isNew,
  readOnly = false,
}: {
  headerId: string;
  isNew: boolean;
  readOnly?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          min-height: 32px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s" data-test-subj="streamsCanvasFlyoutTitle">
            <h1 id={headerId}>
              {isNew
                ? i18n.translate('xpack.streams.routingFlyout.addRoutingLabel', {
                    defaultMessage: 'Add routing',
                  })
                : i18n.translate('xpack.streams.routingFlyout.editRoutingLabel', {
                    defaultMessage: 'Edit routing',
                  })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        {readOnly ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.routingFlyout.readOnlyBadge', {
                defaultMessage: 'Read only',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
}

function RoutingFlyoutForm({
  flyoutRef,
  headerId,
  onClose,
  onBeforeSave,
  readOnly,
}: {
  flyoutRef: RoutingFlyoutActorRef;
  headerId: string;
  onClose: () => void;
  onBeforeSave?: () => void;
  readOnly: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const rules = useSelector(flyoutRef, (state) => state.context.rules);
  const availableSignals = useSelector(flyoutRef, (state) => state.context.availableSignals);
  const isNew = useSelector(flyoutRef, (state) => state.context.target.kind === 'line');
  // Viewers see the rules without editing them; nothing they do is staged.
  const isReadOnly = useSelector(flyoutRef, (state) => state.context.readOnly) || readOnly;
  const editable = useSelector(flyoutRef, (state) => state.context.editable) && !isReadOnly;
  // A routing node with telemetry-scoped rule lists cannot be edited here.
  const isUnsupported = !editable && !isReadOnly;
  const hasChanges = useSelector(flyoutRef, (state) => state.context.hasChanges);
  const saveError = useSelector(flyoutRef, (state) => state.context.saveError);
  const isSaving = useSelector(flyoutRef, (state) => state.matches('saving'));
  const canSave =
    useSelector(flyoutRef, (state) => state.can({ type: 'flyout.save' })) && !isReadOnly;

  const addRule = useCallback(() => flyoutRef.send({ type: 'rule.add' }), [flyoutRef]);
  const updateRule = useCallback(
    (key: string, changes: RoutingRuleChanges) =>
      flyoutRef.send({ type: 'rule.update', key, changes }),
    [flyoutRef]
  );
  const deleteRule = useCallback(
    (key: string) => flyoutRef.send({ type: 'rule.delete', key }),
    [flyoutRef]
  );
  const reorderRule = useCallback(
    (from: number, to: number) => flyoutRef.send({ type: 'rule.reorder', from, to }),
    [flyoutRef]
  );
  const save = useCallback(() => {
    if (isReadOnly) {
      return;
    }
    onBeforeSave?.();
    flyoutRef.send({ type: 'flyout.save' });
  }, [flyoutRef, onBeforeSave, isReadOnly]);

  const confirmClose = useDiscardConfirm(onClose, {
    enabled: hasChanges,
    ...discardRoutingChangesPromptOptions,
  });
  // Closing does not cancel a save in flight, so the flyout stays open until it settles.
  const requestClose = isSaving ? () => {} : confirmClose;

  return (
    <EuiFlyout
      size="m"
      aria-labelledby={headerId}
      onClose={requestClose}
      data-test-subj="streamsRoutingFlyout"
      paddingSize="none"
    >
      <RoutingFlyoutHeader headerId={headerId} isNew={isNew} readOnly={!editable} />
      <EuiFlyoutBody>
        <div
          css={css`
            padding: ${euiTheme.size.l};
          `}
        >
          {isUnsupported ? (
            <>
              <KbnInfoCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.streams.routingFlyout.readOnlyCallout', {
                  defaultMessage:
                    'This routing uses telemetry-specific rule lists. Edit it in the YAML configuration.',
                })}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          {saveError ? (
            <>
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate('xpack.streams.routingFlyout.saveErrorTitle', {
                  defaultMessage: 'Unable to apply routing',
                })}
                text={saveError}
                data-test-subj="streamsRoutingFlyoutSaveError"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <RoutingRuleList
            rules={rules}
            availableSignals={availableSignals}
            editable={editable && !isSaving}
            isNew={isNew}
            onAdd={addRule}
            onChange={updateRule}
            onDelete={deleteRule}
            onReorder={reorderRule}
          />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <div
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.l};
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isDisabled={isSaving}
                onClick={requestClose}
                data-test-subj="streamsRoutingFlyoutCancel"
              >
                {i18n.translate('xpack.streams.routingFlyout.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isSaving}
                isDisabled={!canSave}
                onClick={save}
                data-test-subj="streamsRoutingFlyoutSave"
              >
                {isNew
                  ? i18n.translate('xpack.streams.routingFlyout.create', {
                      defaultMessage: 'Create',
                    })
                  : i18n.translate('xpack.streams.routingFlyout.apply', {
                      defaultMessage: 'Apply',
                    })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
