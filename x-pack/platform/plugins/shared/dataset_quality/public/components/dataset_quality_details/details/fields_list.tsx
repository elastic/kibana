/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiSkeletonRectangle,
} from '@elastic/eui';

export function FieldsList({
  fields,
  dataTestSubj = 'datasetQualityDetailsFieldsList',
}: {
  fields: Array<{
    fieldTitle: string;
    fieldValue: ReactNode;
    isLoading: boolean;
    actionsMenu?: ReactNode;
  }>;
  dataTestSubj?: string;
}) {
  return (
    <EuiPanel hasBorder grow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup direction="column" gutterSize="none">
        {fields.map(({ fieldTitle, fieldValue, isLoading: isFieldLoading, actionsMenu }, index) => (
          <Fragment key={index + fieldTitle}>
            <EuiFlexGroup
              data-test-subj={`datasetQualityDetailsFieldsList-${fieldTitle
                .toLowerCase()
                .split(' ')
                .join('_')}`}
            >
              <EuiFlexItem grow={1}>
                <EuiTitle size="xxs">
                  <span>{fieldTitle}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={4} data-test-subj="datasetQualityDetailsFieldValue">
                <EuiSkeletonRectangle width={260} isLoading={isFieldLoading} title={fieldTitle}>
                  {fieldValue}
                </EuiSkeletonRectangle>
              </EuiFlexItem>
              {actionsMenu}
            </EuiFlexGroup>
            {index < fields.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
