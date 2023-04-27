/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import {
  ERRORS_CONTAINER_MAX_WIDTH,
  ERRORS_CONTAINER_MIN_WIDTH,
  getErrorsViewerTableColumns,
} from './helpers';
import type { ErrorSummary } from '../../../types';

const ErrorsViewerContainer = styled.div`
  max-width: ${ERRORS_CONTAINER_MAX_WIDTH}px;
  min-width: ${ERRORS_CONTAINER_MIN_WIDTH}px;
`;

interface Props {
  errorSummary: ErrorSummary[];
}

const ErrorsViewerComponent: React.FC<Props> = ({ errorSummary }) => {
  const columns = useMemo(() => getErrorsViewerTableColumns(), []);

  return (
    <ErrorsViewerContainer data-test-subj="errorsViewer">
      <EuiInMemoryTable
        columns={columns}
        compressed={true}
        items={errorSummary}
        sorting={false}
        pagination={true}
      />
    </ErrorsViewerContainer>
  );
};

ErrorsViewerComponent.displayName = 'ErrorsViewerComponent';

export const ErrorsViewer = React.memo(ErrorsViewerComponent);
