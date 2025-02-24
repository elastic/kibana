/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import type { ConnectorTypeFields } from '../../../common/types/domain';
import type { CaseActionConnector } from '../types';
import { getCaseConnectors } from '.';

interface Props {
  connector: CaseActionConnector | null;
  fields: ConnectorTypeFields['fields'];
}

const ConnectorFieldsFormPreviewComponent: React.FC<Props> = ({ connector, fields }) => {
  const { caseConnectorsRegistry } = getCaseConnectors();

  if (connector == null || connector.actionTypeId == null || connector.actionTypeId === '.none') {
    return null;
  }

  const { previewComponent: PreviewComponent } = caseConnectorsRegistry.get(connector.actionTypeId);

  return (
    <>
      {PreviewComponent != null ? (
        <Suspense
          fallback={
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <div data-test-subj={'connector-fields-preview'}>
            <PreviewComponent connector={connector} fields={fields} key={connector.id} />
          </div>
        </Suspense>
      ) : null}
    </>
  );
};

ConnectorFieldsFormPreviewComponent.displayName = 'ConnectorFieldsFormPreview';

export const ConnectorFieldsPreviewForm = memo(ConnectorFieldsFormPreviewComponent);
