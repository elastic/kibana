/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
const FIELD_STATS_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.dataVisualizer.fieldStats.unavailableTitle',
  {
    defaultMessage: 'Field statistics not supported for ES|QL queries',
  }
);

const FieldStatsUnavailableMessage = ({
  id,
  title = FIELD_STATS_UNAVAILABLE_TITLE,
}: {
  id?: string;
  title?: string;
}) => {
  return (
    <EuiFlexItem
      alignItems="center"
      fullWidth
      css={css`
        height: 100%;
      `}
    >
      <EmptyPlaceholder icon={'warning'} message={title} />
    </EuiFlexItem>
  );
};

// Default export for lazy loading
// eslint-disable-next-line import/no-default-export
export default FieldStatsUnavailableMessage;
