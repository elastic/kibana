/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiBasicTableColumn, EuiCode, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FailedDocsError } from '../../../../../common/api_types';

const contentColumnName = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.contentLabel',
  {
    defaultMessage: 'Content',
  }
);

const typeColumnName = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.typeLabel',
  {
    defaultMessage: 'Type',
  }
);

const typeColumnTooltip = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.typeTooltip',
  {
    defaultMessage: 'Error message category',
  }
);

export const getFailedDocsErrorsColumns = (): Array<EuiBasicTableColumn<FailedDocsError>> => [
  {
    name: contentColumnName,
    field: 'message',
    render: (_, { message }) => {
      return <EuiCode language="js">{message}</EuiCode>;
    },
  },
  {
    name: (
      <EuiToolTip content={typeColumnTooltip}>
        <span>
          {`${typeColumnName} `}
          <EuiIcon size="s" color="subdued" type="question" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    field: 'type',
    render: (_, { type }) => {
      return (
        <EuiBadge color="hollow">
          <strong>{type}</strong>
        </EuiBadge>
      );
    },
    sortable: true,
  },
];
