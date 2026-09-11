/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { removeMultilines } from '../../../../common/utils/build_query/remove_multilines';

const titleCss = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  marginBottom: 0,
};

// Trimmed as well as ellipsized; the full query stays in the `title` tooltip.
const MAX_TITLE_LENGTH = 60;

interface QueryTitleProps {
  query: string;
}

const QueryTitleComponent: React.FC<QueryTitleProps> = ({ query }) => {
  const oneLine = removeMultilines(query);
  const displayed =
    oneLine.length > MAX_TITLE_LENGTH
      ? `${oneLine.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
      : oneLine;

  return (
    <EuiText>
      <h1 css={titleCss} title={oneLine} data-test-subj="query-details-title">
        {displayed}
      </h1>
    </EuiText>
  );
};

QueryTitleComponent.displayName = 'QueryTitle';

export const QueryTitle = React.memo(QueryTitleComponent);
