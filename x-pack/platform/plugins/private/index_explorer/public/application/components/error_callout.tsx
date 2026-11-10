/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { getErrorMessage } from '../lib/download';

/** Danger callout showing the server-provided error message. */
export function ErrorCallout({ title, error }: { title: string; error?: Error }) {
  return (
    <KbnDangerCallout
      announceOnMount
      title={title}
      text={error ? <p>{getErrorMessage(error)}</p> : undefined}
      data-test-subj="indexExplorerError"
    />
  );
}
