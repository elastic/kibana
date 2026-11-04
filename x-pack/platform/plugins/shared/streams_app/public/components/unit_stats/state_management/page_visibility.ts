/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, distinctUntilChanged, fromEvent, map, startWith } from 'rxjs';

/**
 * Whether the page is in view. It emits the current state when it is subscribed to, so a page that
 * opens in a background tab starts as hidden, and then emits each change.
 */
export const pageVisible$ = defer(() =>
  fromEvent(document, 'visibilitychange').pipe(
    startWith(undefined),
    map(() => document.visibilityState === 'visible'),
    distinctUntilChanged()
  )
);
