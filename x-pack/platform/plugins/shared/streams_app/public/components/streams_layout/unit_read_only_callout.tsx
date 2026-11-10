/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';

/** Explains why the map and tables cannot be edited by users without management privileges. */
export function UnitReadOnlyCallout() {
  return (
    <KbnInfoCallout
      size="s"
      data-test-subj="streamsUnitReadOnlyCallout"
      title={i18n.translate('xpack.streams.unitReadOnlyCallout.title', {
        defaultMessage: 'You have read-only access',
      })}
      text={i18n.translate('xpack.streams.unitReadOnlyCallout.text', {
        defaultMessage:
          'Editing sources, destinations, and the map requires the Streams management privileges and permissions.',
      })}
    />
  );
}
