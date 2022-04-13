/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { Event, IShipper } from 'src/core/public';

export class CustomShipper implements IShipper {
  public static shipperName = 'FTR-helpers-shipper';

  constructor(private readonly events$: Subject<Event>) {}

  public reportEvents(events: Event[]) {
    events.forEach((event) => {
      this.events$.next(event);
    });
  }
  optIn(isOptedIn: boolean) {}
  shutdown() {}
}
