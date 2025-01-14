/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';

export function getLogError(getExecutionContext: () => KibanaExecutionContext | undefined) {
  return (type: 'runtime' | 'validation') => {
    trackUiCounterEvents(
      type === 'runtime' ? 'embeddable_runtime_error' : 'embeddable_validation_error',
      getExecutionContext()
    );
  };
}
