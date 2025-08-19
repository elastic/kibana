/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ResourceResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';

interface ResourceResultStepProps {
  result: ResourceResult;
}

const ResourceLink: React.FC<{ result: ResourceResult }> = ({
  result: {
    data: { content, title },
  },
}) => {
  const url: unknown = content.url;
  let displayTitle = title;
  if (!displayTitle) {
    if (content.title && typeof content.title === 'string') {
      displayTitle = content.title;
    } else {
      displayTitle = 'Untitled Resource';
    }
  }
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return <h3>{displayTitle}</h3>;
  }
  return (
    <EuiLink href={url} target="_blank">
      {displayTitle}
    </EuiLink>
  );
};

const resourceResultColumns: Array<EuiBasicTableColumn<{ resourceLink: ResourceResult }>> = [
  {
    field: 'resourceLink',
    name: 'Resource',
    render: (result: ResourceResult) => <ResourceLink result={result} />,
  },
];

const hideTableHeaderStyles = css`
  thead {
    display: none;
  }
`;

export const ResourceResultStep: React.FC<ResourceResultStepProps> = ({ result }) => {
  return (
    <EuiBasicTable
      css={hideTableHeaderStyles}
      columns={resourceResultColumns}
      items={[{ resourceLink: result }]}
    />
  );
};
