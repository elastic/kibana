/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isEqual } from 'lodash';
import type { AiIndexItem } from '../../common/http_api/ai_indices';

/** Fields of an AI index a save can change; the id and timestamps are not compared. */
export type AiIndexChangeField = Exclude<
  keyof AiIndexItem,
  'id' | 'date_created' | 'date_modified'
>;

const IGNORED_FIELDS: ReadonlySet<string> = new Set(['id', 'date_created', 'date_modified']);

/** An AI index created, updated or deleted through the AI index APIs. */
export interface AiIndexChange {
  aiIndexId: string;
  spaceId: string;
  /** The request that saved it. Handlers act on its behalf, for example to schedule workflows. */
  request: KibanaRequest;
  /** The AI index before the save; missing when the save created it. */
  previous?: AiIndexItem;
  /** The AI index after the save; missing when the save deleted it. */
  current?: AiIndexItem;
  /**
   * The fields the save wrote, changed or not, when it wrote only some of them, such as
   * `feedback_analysis`. Missing: it wrote the whole AI index (create, replace or delete).
   */
  saved?: readonly AiIndexChangeField[];
}

export interface AiIndexChangeEvent extends Omit<AiIndexChange, 'saved'> {
  /** Top-level fields whose value differs between `previous` and `current`. */
  changed: ReadonlySet<AiIndexChangeField>;
  /** The fields the save wrote; missing when it wrote the whole AI index. */
  saved?: ReadonlySet<AiIndexChangeField>;
}

export interface AiIndexChangeHandler {
  /** Names the handler in logs. Unique across handlers. */
  id: string;
  /** The fields the handler reacts to. Missing: it runs on every save and delete. */
  fields?: readonly AiIndexChangeField[];
  /**
   * `changed` (default) runs the handler when one of `fields` changed value. `saved` also runs it
   * on delete and when a partial save wrote one of them.
   */
  when?: 'changed' | 'saved';
  onChange: (event: AiIndexChangeEvent) => Promise<void>;
}

/** The top-level fields whose value differs between two versions of an AI index. */
export const diffAiIndex = (
  previous: AiIndexItem | undefined,
  current: AiIndexItem | undefined
): Set<AiIndexChangeField> => {
  const before: Partial<AiIndexItem> = previous ?? {};
  const after: Partial<AiIndexItem> = current ?? {};
  const changed = new Set<AiIndexChangeField>();
  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED_FIELDS.has(field)) {
      continue;
    }
    const key = field as AiIndexChangeField;
    if (!isEqual(before[key], after[key])) {
      changed.add(key);
    }
  }
  return changed;
};

const shouldRun = (
  { fields, when = 'changed' }: AiIndexChangeHandler,
  { changed, saved, current }: AiIndexChangeEvent
): boolean => {
  if (fields === undefined) {
    return true;
  }
  if (fields.some((field) => changed.has(field))) {
    return true;
  }
  if (when !== 'saved') {
    return false;
  }
  return current === undefined || (saved !== undefined && fields.some((field) => saved.has(field)));
};

/**
 * Tells the handlers registered at setup that an AI index was saved, and what changed.
 * A handler that fails is logged and does not stop the others: the save itself already happened.
 */
export class AiIndexChangeNotifier {
  private readonly handlers = new Map<string, AiIndexChangeHandler>();
  private frozen = false;

  constructor(private readonly logger: Logger) {}

  register(handler: AiIndexChangeHandler): void {
    if (this.frozen) {
      throw new Error('AI index change handlers must be registered during plugin setup');
    }
    if (this.handlers.has(handler.id)) {
      throw new Error(`AI index change handler '${handler.id}' is already registered`);
    }
    this.handlers.set(handler.id, handler);
  }

  /** Marks setup complete; further `register()` calls are rejected. */
  freeze(): void {
    this.frozen = true;
  }

  async notify({ saved, ...change }: AiIndexChange): Promise<void> {
    const event: AiIndexChangeEvent = {
      ...change,
      changed: diffAiIndex(change.previous, change.current),
      ...(saved !== undefined && { saved: new Set(saved) }),
    };
    const handlers = [...this.handlers.values()].filter((handler) => shouldRun(handler, event));
    await Promise.all(handlers.map((handler) => this.run(handler, event)));
  }

  private async run(handler: AiIndexChangeHandler, event: AiIndexChangeEvent): Promise<void> {
    try {
      await handler.onChange(event);
    } catch (error) {
      this.logger.warn(
        `${event.current ? 'Saved' : 'Deleted'} AI index '${event.aiIndexId}' in space '${
          event.spaceId
        }', but '${handler.id}' failed to apply the change: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
