/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAddedEvent, AttachmentAddedEventData } from '@kbn/agent-builder-common';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import { createAttachmentAddedEvent } from './items/attachment_added_event.factory';
import { createAttachmentUpdatedEvent } from './items/attachment_updated_event.factory';
import {
  agentRefsByExecutionId,
  attachmentEventToRef,
  inputRefsByMessageId,
} from './attachment_event_refs';

const added = (
  overrides: Omit<Partial<AttachmentAddedEvent>, 'data'> & {
    data?: Partial<AttachmentAddedEventData>;
  } = {}
): AttachmentAddedEvent =>
  createAttachmentAddedEvent({
    ...overrides,
    data: {
      attachment_id: 'a1',
      attachment_type: 'dashboard',
      current_version: 1,
      render_inline: false,
      source: 'chat_input',
      format: 2,
      ...(overrides.data ?? {}),
    },
  });

describe('attachment event refs', () => {
  it('turns added and updated events into refs with the operation and actor of their source', () => {
    expect(attachmentEventToRef(added())).toEqual({
      attachment_id: 'a1',
      version: 1,
      operation: ATTACHMENT_REF_OPERATION.created,
      actor: ATTACHMENT_REF_ACTOR.user,
    });
    const updated = createAttachmentUpdatedEvent();
    expect(
      attachmentEventToRef({ ...updated, data: { ...updated.data, source: 'execution' } })
    ).toMatchObject({
      operation: ATTACHMENT_REF_OPERATION.updated,
      actor: ATTACHMENT_REF_ACTOR.agent,
    });
  });

  it('indexes the input refs of each message, skipping hidden, legacy and execution events', () => {
    const events = [
      added({ id: 'e1', trigger_event_id: 'm1' }),
      added({ id: 'e2', trigger_event_id: 'm1', data: { attachment_id: 's', hidden: true } }),
      added({
        id: 'e3',
        trigger_event_id: 'm1',
        data: { attachment_id: 'old', format: undefined },
      }),
      added({
        id: 'e4',
        trigger_event_id: 'm1',
        data: { attachment_id: 'tool', source: 'execution' },
      }),
    ];
    expect(
      inputRefsByMessageId(events)
        .get('m1')
        ?.map((ref) => ref.attachment_id)
    ).toEqual(['a1']);
  });

  it('groups agent refs by the canonical execution of their turn', () => {
    const events = [
      added({ id: 'e1', execution_id: 'r::execution::1', data: { source: 'execution' } }),
    ];
    const refs = agentRefsByExecutionId(events, new Map([['r::execution::1', 'r::execution']]));
    expect(refs.get('r::execution')?.map((ref) => ref.attachment_id)).toEqual(['a1']);
  });
});
