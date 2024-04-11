/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { PerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { Stats } from '../../../data_anonymization_editor/stats';
import { ContextEditor } from '../../../data_anonymization_editor/context_editor';
import type { BatchUpdateListItem } from '../../../data_anonymization_editor/context_editor/types';
import * as i18n from './translations';

export interface Props {
  defaultPageSize?: number;
  anonymizationFields: FindAnonymizationFieldsResponse;
  anonymizationFieldsBulkActions: PerformBulkActionRequestBody;
  setAnonymizationFieldsBulkActions: React.Dispatch<
    React.SetStateAction<PerformBulkActionRequestBody>
  >;
  setUpdatedAnonymizationData: React.Dispatch<
    React.SetStateAction<FindAnonymizationFieldsResponse>
  >;
}

const AnonymizationSettingsComponent: React.FC<Props> = ({
  defaultPageSize,
  anonymizationFields,
  anonymizationFieldsBulkActions,
  setAnonymizationFieldsBulkActions,
  setUpdatedAnonymizationData,
}) => {
  const onListUpdated = useCallback(
    async (updates: BatchUpdateListItem[]) => {
      const updatedFieldsKeys = updates.map((u) => u.field);

      const updatedFields = updates.map((u) => ({
        ...(anonymizationFields.data.find((f) => f.field === u.field) ?? { id: '', field: '' }),
        ...(u.update === 'allow' || u.update === 'defaultAllow'
          ? { allowed: u.operation === 'add' }
          : {}),
        ...(u.update === 'allowReplacement' || u.update === 'defaultAllowReplacement'
          ? { anonymized: u.operation === 'add' }
          : {}),
      }));
      setAnonymizationFieldsBulkActions({
        ...anonymizationFieldsBulkActions,
        // Only update makes sense now, as long as we don't have an add new field design/UX
        update: [...(anonymizationFieldsBulkActions?.update ?? []), ...updatedFields],
      });
      setUpdatedAnonymizationData({
        ...anonymizationFields,
        data: [
          ...anonymizationFields.data.filter((f) => !updatedFieldsKeys.includes(f.field)),
          ...updatedFields,
        ],
      });
    },
    [
      anonymizationFields,
      anonymizationFieldsBulkActions,
      setAnonymizationFieldsBulkActions,
      setUpdatedAnonymizationData,
    ]
  );
  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size={'xs'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>

      <EuiHorizontalRule margin={'s'} />

      <EuiFlexGroup alignItems="center" data-test-subj="summary" gutterSize="none">
        <Stats isDataAnonymizable={true} anonymizationFields={anonymizationFields.data} />
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <ContextEditor
        anonymizationFields={anonymizationFields}
        onListUpdated={onListUpdated}
        rawData={null}
        pageSize={defaultPageSize}
      />
    </>
  );
};

AnonymizationSettingsComponent.displayName = 'AnonymizationSettingsComponent';

export const AnonymizationSettings = React.memo(AnonymizationSettingsComponent);
