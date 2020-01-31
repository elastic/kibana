/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiBottomBar } from '@elastic/eui';

import { MODE as DATAVISUALIZER_MODE } from '../file_datavisualizer_view';

export function BottomBar({ showBar, mode, changeMode, onCancel, disableImport }) {
  if (showBar) {
    if (mode === DATAVISUALIZER_MODE.READ) {
      return (
        <EuiBottomBar>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={disableImport === true}
                onClick={() => changeMode(DATAVISUALIZER_MODE.IMPORT)}
              >
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.bottomBar.readMode.importButtonLabel"
                  defaultMessage="Import"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" onClick={() => onCancel()}>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.bottomBar.readMode.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      );
    } else {
      return (
        <EuiBottomBar>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton color="ghost" onClick={() => changeMode(DATAVISUALIZER_MODE.READ)}>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.bottomBar.backButtonLabel"
                  defaultMessage="Back"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" onClick={() => onCancel()}>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.bottomBar.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      );
    }
  }
  return null;
}
