/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { CurrentUser, TimelineEvent, EventActor } from '@kbn/agent-builder-common';
import { CONVERSATION_SCHEMA_VERSION, EventActorType } from '@kbn/agent-builder-common';
import type {
  ConversationStorage,
  ConversationProperties,
} from '../../conversation/client/storage';
import { conversationIndexName, createStorage } from '../../conversation/client/storage';

const UPDATE_RETRY_ON_CONFLICT = 5;

/**
 * Distributive `Omit` over the {@link TimelineEvent} union: preserves the correlation between
 * each event's `type` and its `data` while dropping the server-assigned fields.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * A timeline event as supplied by a caller. `id`, `created_at`, and `actor` are server-assigned
 * when omitted (id and timestamp are generated; the actor defaults to the scoped user).
 */
export type TimelineEventInput = DistributiveOmit<TimelineEvent, 'id' | 'created_at' | 'actor'> & {
  id?: string;
  created_at?: string;
  actor?: EventActor;
};

export interface CreateEventsConversationParams {
  /** Conversation id. Generated when omitted. */
  id?: string;
  /** The agent this conversation is bound to. */
  agentId: string;
  /** Optional title. */
  title?: string;
}

export interface GetEventsOptions {
  /** Return only events after the one with this id (exclusive). */
  afterEventId?: string;
  /** Cap the number of events returned (applied after `afterEventId`). */
  limit?: number;
}

/**
 * Scoped client for the conversation event timeline.
 *
 * Reads and writes the `events` array on the conversation document. Appends are atomic scripted
 * updates (`ctx._source.events.add`) with `retry_on_conflict`, so concurrent writers do not
 * overwrite each other — unlike the whole-document read-modify-write used for rounds.
 */
export interface ConversationEventsClient {
  /** Create a new events-native conversation document. */
  create(params: CreateEventsConversationParams): Promise<{ id: string }>;
  /** Append events to a conversation's timeline. Returns the events as stored (with ids/timestamps). */
  appendEvents(conversationId: string, events: TimelineEventInput[]): Promise<TimelineEvent[]>;
  /** Read a conversation's timeline, in order. */
  getEvents(conversationId: string, options?: GetEventsOptions): Promise<TimelineEvent[]>;
}

export const createClient = ({
  space,
  logger,
  esClient,
  user,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  user: CurrentUser;
}): ConversationEventsClient => {
  const storage = createStorage({ logger, esClient });
  return new ConversationEventsClientImpl({ storage, esClient, space, user });
};

class ConversationEventsClientImpl implements ConversationEventsClient {
  private readonly storage: ConversationStorage;
  private readonly esClient: ElasticsearchClient;
  private readonly space: string;
  private readonly user: CurrentUser;

  constructor({
    storage,
    esClient,
    space,
    user,
  }: {
    storage: ConversationStorage;
    esClient: ElasticsearchClient;
    space: string;
    user: CurrentUser;
  }) {
    this.storage = storage;
    this.esClient = esClient;
    this.space = space;
    this.user = user;
  }

  async create({ id, agentId, title }: CreateEventsConversationParams): Promise<{ id: string }> {
    const conversationId = id ?? uuidv4();
    const now = new Date().toISOString();
    const document: ConversationProperties = {
      user_id: this.user.id,
      user_name: this.user.username,
      agent_id: agentId,
      space: this.space,
      title: title ?? '',
      created_at: now,
      updated_at: now,
      schema_version: CONVERSATION_SCHEMA_VERSION,
      events: [],
      // events-native documents carry no rounds; an empty array satisfies the strict mapping.
      conversation_rounds: [],
    };

    await this.storage.getClient().index({
      id: conversationId,
      document,
      op_type: 'create',
    });

    return { id: conversationId };
  }

  async appendEvents(
    conversationId: string,
    events: TimelineEventInput[]
  ): Promise<TimelineEvent[]> {
    if (events.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const stamped: TimelineEvent[] = events.map((event) => this.stampEvent(event, now));

    await this.esClient.update({
      index: conversationIndexName,
      id: conversationId,
      retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
      script: {
        source: `
          if (ctx._source.events == null) { ctx._source.events = []; }
          for (def e : params.new_events) { ctx._source.events.add(e); }
          ctx._source.updated_at = params.now;
        `,
        params: { new_events: stamped, now },
      },
    });

    return stamped;
  }

  async getEvents(
    conversationId: string,
    options: GetEventsOptions = {}
  ): Promise<TimelineEvent[]> {
    const source = await this.getSource(conversationId);
    if (!source) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    let events: TimelineEvent[] = source.events ?? [];

    if (options.afterEventId) {
      const index = events.findIndex((event) => event.id === options.afterEventId);
      if (index >= 0) {
        events = events.slice(index + 1);
      }
    }

    if (options.limit != null) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  private stampEvent(event: TimelineEventInput, now: string): TimelineEvent {
    return {
      ...event,
      id: event.id ?? uuidv4(),
      created_at: event.created_at ?? now,
      actor: event.actor ?? this.defaultActor(),
    } as TimelineEvent;
  }

  private defaultActor(): EventActor {
    return {
      type: EventActorType.user,
      id: this.user.id ?? this.user.username,
      ...(this.user.username ? { username: this.user.username } : {}),
    };
  }

  private async getSource(conversationId: string): Promise<ConversationProperties | undefined> {
    try {
      const response = await this.esClient.get<ConversationProperties>({
        index: conversationIndexName,
        id: conversationId,
      });
      return response._source;
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return undefined;
      }
      throw err;
    }
  }
}
