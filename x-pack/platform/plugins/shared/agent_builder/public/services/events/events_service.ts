/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, share } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';

export class EventsService {
  private readonly events$ = new Subject<BrowserChatEvent>();
  public readonly obs$ = this.events$.asObservable().pipe(share());

  constructor() {}

  propagateChatEvent(event: ChatEvent) {
    this.events$.next(event);
  }
}
