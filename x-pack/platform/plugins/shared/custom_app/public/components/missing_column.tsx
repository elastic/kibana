/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

/** Shown when a node asks for a result column that the query does not return. */
export const MissingColumn = ({ columns }: { columns: readonly string[] }) => (
  <KbnDangerCallout
    announceOnMount={false}
    size="s"
    title={i18n.translate('xpack.customApp.missingColumn.title', {
      defaultMessage:
        '{count, plural, one {The query has no column named {columns}} other {The query has no columns named {columns}}}',
      values: { count: columns.length, columns: columns.map((column) => `"${column}"`).join(', ') },
    })}
  />
);
