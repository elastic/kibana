/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState, type FC } from 'react';

import { useEuiTheme, EuiAccordion, EuiPagination } from '@elastic/eui';
import { css } from '@emotion/react';

const PAGE_SIZE = 100;

export interface DocFailure {
  item: number;
  reason: string;
  doc: {
    message: string;
  };
}

interface FailuresProps {
  failedDocs: DocFailure[];
}

const containerStyle = css({
  maxHeight: '200px',
  overflowY: 'auto',
});

export const Failures: FC<FailuresProps> = ({ failedDocs }) => {
  const { euiTheme } = useEuiTheme();

  const [page, setPage] = useState(0);

  const startIndex = page * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  return (
    <EuiAccordion
      id="failureList"
      buttonContent={
        <FormattedMessage
          id="xpack.dataVisualizer.file.importSummary.failedDocumentsButtonLabel"
          defaultMessage="Failed documents"
        />
      }
      paddingSize="m"
    >
      <div css={containerStyle}>
        {failedDocs.length > PAGE_SIZE && (
          <EuiPagination
            pageCount={Math.ceil(failedDocs.length / PAGE_SIZE)}
            activePage={page}
            onPageClick={(newPage) => setPage(newPage)}
            compressed
          />
        )}
        {failedDocs.slice(startIndex, endIndex).map(({ item, reason, doc }) => (
          <div key={item}>
            <div
              css={{
                color: euiTheme.colors.danger,
              }}
            >
              {item}: {reason}
            </div>
            <div>{JSON.stringify(doc)}</div>
          </div>
        ))}
      </div>
    </EuiAccordion>
  );
};
