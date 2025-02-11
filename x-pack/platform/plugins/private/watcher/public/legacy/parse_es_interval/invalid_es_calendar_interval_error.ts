/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@kbn/datemath';
import { i18n } from '@kbn/i18n';

export class InvalidEsCalendarIntervalError extends Error {
  constructor(
    public readonly interval: string,
    public readonly value: number,
    public readonly unit: Unit,
    public readonly type: string
  ) {
    super(
      i18n.translate('xpack.watcher.data.parseEsInterval.invalidEsCalendarIntervalErrorMessage', {
        defaultMessage: 'Invalid calendar interval: {interval}, value must be 1',
        values: { interval },
      })
    );

    this.name = 'InvalidEsCalendarIntervalError';
    this.value = value;
    this.unit = unit;
    this.type = type;

    // captureStackTrace is only available in the V8 engine, so any browser using
    // a different JS engine won't have access to this method.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidEsCalendarIntervalError);
    }

    // Babel doesn't support traditional `extends` syntax for built-in classes.
    // https://babeljs.io/docs/en/caveats/#classes
    Object.setPrototypeOf(this, InvalidEsCalendarIntervalError.prototype);
  }
}
