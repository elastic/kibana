/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FlyoutFooter = ({ onClose }: { onClose: () => void }) => {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            {i18n.translate(
              'xpack.apm.settings.customizeUI.customActions.flyout.close',
              {
                defaultMessage: 'Close'
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill type="submit">
            {i18n.translate(
              'xpack.apm.settings.customizeUI.customActions.flyout.save',
              {
                defaultMessage: 'Save'
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
