/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButton } from '@elastic/eui';
import { css } from '@emotion/react';

import { usePipelineProcessorsContext } from '../context';

export interface Props {
  onClick: () => void;
  renderButtonAsLink?: boolean;
}

const addProcessorButtonLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.addProcessorButtonLabel',
  {
    defaultMessage: 'Add a processor',
  }
);

const styles = {
  button: css`
    width: fit-content;
  `,
};

export const AddProcessorButton = forwardRef<HTMLButtonElement, Props>((props, ref) => {
  const { onClick, renderButtonAsLink } = props;
  const {
    state: { editor },
  } = usePipelineProcessorsContext();

  if (renderButtonAsLink) {
    return (
      <EuiButtonEmpty
        data-test-subj="addProcessorButton"
        disabled={editor.mode.id !== 'idle'}
        iconSide="left"
        iconType="plusInCircle"
        onClick={onClick}
        buttonRef={ref}
      >
        {addProcessorButtonLabel}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButton
      data-test-subj="addProcessorButton"
      css={styles.button}
      disabled={editor.mode.id !== 'idle'}
      onClick={onClick}
      buttonRef={ref}
    >
      {addProcessorButtonLabel}
    </EuiButton>
  );
});
