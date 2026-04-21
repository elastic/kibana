/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TurnOffCapabilitiesModalProps {
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const TurnOffCapabilitiesModal: React.FC<TurnOffCapabilitiesModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      data-test-subj="turnOffCapabilitiesModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.agentBuilder.overview.turnOffCapabilities.title', {
            defaultMessage: 'Turn off auto-included capabilities?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.agentBuilder.overview.turnOffCapabilities.body', {
              defaultMessage:
                'This will remove all built-in skills, plugins, and tools that were added automatically. You\u2019ll need to add and manage those capabilities manually going forward. You can turn this back on at any time.',
            })}
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="turnOffCapabilitiesDontShowAgain"
              label={i18n.translate(
                'xpack.agentBuilder.overview.turnOffCapabilities.dontShowAgain',
                { defaultMessage: "Don't show this warning again" }
              )}
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              data-test-subj="turnOffCapabilitiesDontShowAgainCheckbox"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiButtonEmpty onClick={onCancel}>
                {i18n.translate('xpack.agentBuilder.overview.turnOffCapabilities.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
              <EuiButton
                color="danger"
                fill
                onClick={() => onConfirm(dontShowAgain)}
                data-test-subj="turnOffCapabilitiesConfirmButton"
              >
                {i18n.translate('xpack.agentBuilder.overview.turnOffCapabilities.confirm', {
                  defaultMessage: 'Turn off',
                })}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
