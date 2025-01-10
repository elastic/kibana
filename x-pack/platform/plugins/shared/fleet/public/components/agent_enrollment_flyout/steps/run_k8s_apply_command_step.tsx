/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCodeBlock, EuiCopy, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';

export const KubernetesManifestApplyStep = ({
  isComplete,
  fullCopyButton,
  onCopy,
}: {
  isComplete?: boolean;
  fullCopyButton?: boolean;
  onCopy?: () => void;
}): EuiContainedStepProps => {
  const [copyButtonClicked, setCopyButtonClicked] = useState(false);
  // Otherwise the copy button is over the text
  const CommandCode = styled.pre({
    overflow: 'auto',
  });
  const onTextAreaClick = () => {
    if (onCopy) onCopy();
  };
  const onCopyButtonClick = (copy: () => void) => {
    copy();
    setCopyButtonClicked(true);
    if (onCopy) onCopy();
  };
  const status = isComplete ? 'complete' : undefined;
  return {
    status,
    title: i18n.translate('xpack.fleet.agentEnrollment.stepKubernetesApplyManifest', {
      defaultMessage: 'Run the apply command',
    }),
    children: (
      <>
        <EuiText>
          <EuiSpacer size="s" />
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.kubernetesCommandInstructions"
            defaultMessage="From the directory where the manifest is downloaded, run the apply command."
          />
          <EuiSpacer size="m" />
        </EuiText>
        <EuiCodeBlock
          onClick={onTextAreaClick}
          fontSize="m"
          isCopyable={!fullCopyButton}
          paddingSize="m"
          css={`
            max-width: 1100px;
          `}
        >
          <CommandCode>kubectl apply -f elastic-agent-managed-kubernetes.yml</CommandCode>
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        {fullCopyButton && (
          <EuiCopy textToCopy="kubectl apply -f elastic-agent-managed-kubernetes.yml">
            {(copy) => (
              <EuiButton
                color="primary"
                iconType="copyClipboard"
                size="m"
                onClick={() => onCopyButtonClick(copy)}
              >
                {copyButtonClicked ? (
                  <FormattedMessage
                    id="xpack.fleet.enrollmentInstructions.copyButtonClicked"
                    defaultMessage="Copied"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.enrollmentInstructions.copyButton"
                    defaultMessage="Copy to clipboard"
                  />
                )}
              </EuiButton>
            )}
          </EuiCopy>
        )}
      </>
    ),
  };
};
