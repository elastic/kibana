/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const ConnectorViewIndexLink: React.FC<{
  indexName: string;
  target?: boolean;
}> = ({ indexName, target }) => {
  const {
    services: { http },
  } = useKibana();

  return (
    <EuiLink
      target={target ? '_blank' : undefined}
      external={target ?? false}
      href={`${http?.basePath.prepend(
        `/app/management/data/index_management/indices/index_details?indexName=${indexName}`
      )}`}
    >
      {indexName}
    </EuiLink>
  );
};
