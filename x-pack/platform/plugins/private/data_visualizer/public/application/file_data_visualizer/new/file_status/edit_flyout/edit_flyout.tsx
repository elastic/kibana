/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InputOverrides } from '@kbn/file-upload-plugin/common';
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { FormattedOverrides } from '@kbn/file-upload-plugin/common/types';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServerSettings } from '@kbn/file-upload/src/utils';
import { Overrides } from './overrides';

interface Props {
  setOverrides: (overrides: InputOverrides) => void;
  closeEditFlyout: () => void;
  isFlyoutVisible: boolean;
  originalSettings: ServerSettings;
  overrides: FormattedOverrides;
  fields: string[];
}

export const EditFlyout: FC<Props> = ({
  isFlyoutVisible,
  closeEditFlyout,
  setOverrides,
  overrides,
  originalSettings,
  fields,
}) => {
  const [overridesValid, setOverridesValid] = useState<boolean>(true);
  const [applyOverrides, setApplyOverrides] = useState<undefined | (() => void)>(undefined);

  const applyAndClose = useCallback(() => {
    if (typeof applyOverrides !== 'function') {
      return;
    }

    applyOverrides();
    closeEditFlyout();
  }, [applyOverrides, closeEditFlyout]);

  if (!isFlyoutVisible) {
    return null;
  }

  return (
    <EuiFlyout onClose={closeEditFlyout} size="m">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrideSettingsTitle"
              defaultMessage="Override settings!"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Overrides
          setOverrides={setOverrides}
          overrides={overrides}
          originalSettings={originalSettings}
          setApplyOverrides={(ap: () => void) =>
            setApplyOverrides(() => () => {
              ap();
            })
          }
          setOverridesValid={setOverridesValid}
          fields={fields}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeEditFlyout} flush="left">
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.closeOverrideSettingsButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={applyAndClose} isDisabled={overridesValid === false} fill>
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.applyOverrideSettingsButtonLabel"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
