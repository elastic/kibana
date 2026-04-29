/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceWithSecrets } from '../common';
import { useConnectDataSourceFormParts } from './connect_data_source_editor';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';

export interface CreateDataSourceFlyoutProps {
  onClose: () => void;
  /**
   * Persist a new data source. Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (values: {
    name: string;
    dataSource: Omit<DataSourceWithSecrets, 'id'>;
  }) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
  const { form, footerActions } = useConnectDataSourceFormParts({
    variant: 'flyout',
    onCancel: onClose,
    onCompleted: onClose,
    onSave,
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDataSourceFlyoutTitle"
      size="m"
      data-test-subj="createDataSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDataSourceFlyoutTitle">{createDataSourceFlyoutStrings.title()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{form}</EuiFlyoutBody>
      <EuiFlyoutFooter>{footerActions}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};
