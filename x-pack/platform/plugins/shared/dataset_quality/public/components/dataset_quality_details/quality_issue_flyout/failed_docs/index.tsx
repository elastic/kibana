/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useQualityIssues } from '../../../../hooks';
import { QualityIssueFieldInfo } from '../field_info';
import { FailedFieldInfo } from './filed_info';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function FailedDocsFlyout() {
  const { expandedDegradedField, renderedItems } = useQualityIssues();

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField?.name && item.type === expandedDegradedField?.type;
    });
  }, [renderedItems, expandedDegradedField]);

  return (
    <>
      <QualityIssueFieldInfo fieldList={fieldList}>
        <FailedFieldInfo />
      </QualityIssueFieldInfo>
      <EuiSpacer size="s" />
    </>
  );
}
