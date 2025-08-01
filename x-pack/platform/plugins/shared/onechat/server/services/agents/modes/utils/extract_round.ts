/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, filter, firstValueFrom, map } from 'rxjs';
import { ChatAgentEvent, isRoundCompleteEvent } from '@kbn/onechat-common';

export const extractRound = async (events$: Observable<ChatAgentEvent>) => {
  return await firstValueFrom(
    events$.pipe(
      filter(isRoundCompleteEvent),
      map((event) => event.data.round)
    )
  );
};
