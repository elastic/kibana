/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiForm, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { FramePublicAPI, Visualization } from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface StyleAccordionProps {
  activeVisualization: Visualization;
  visualizationState: unknown;
  setVisualizationState: (newState: unknown) => void;
  framePublicAPI: FramePublicAPI;
  isAccordionOpen: boolean;
  onAccordionToggle: (isOpenNext: boolean) => void;
}

export function StyleAccordion({
  activeVisualization,
  visualizationState,
  setVisualizationState,
  framePublicAPI,
  isAccordionOpen,
  onAccordionToggle,
}: StyleAccordionProps) {
  const { euiTheme } = useEuiTheme();
  const FlyoutToolbar = activeVisualization.FlyoutToolbarComponent;

  if (!FlyoutToolbar) {
    return null;
  }

  return (
    <EuiAccordion
      id="lens-style"
      css={css`
        inline-size: 100%;

        .euiAccordion__childWrapper {
          inline-size: 100%;
          max-inline-size: 100%;
        }
      `}
      buttonContent={
        <EuiTitle
          size="xxs"
          css={css`
            padding: 2px;
          `}
        >
          <h5>
            {i18n.translate('xpack.lens.inlineStyle.accordionTitle', {
              defaultMessage: 'Style',
            })}
          </h5>
        </EuiTitle>
      }
      buttonProps={{
        paddingSize: 'm',
      }}
      initialIsOpen={isAccordionOpen}
      forceState={isAccordionOpen ? 'open' : 'closed'}
      onToggle={onAccordionToggle}
      data-test-subj="lensStyleAccordion"
    >
      <EuiForm
        fullWidth
        data-test-subj="lensInlineStyleForm"
        css={css`
          padding: 0 0 ${euiTheme.size.base};
        `}
      >
        <FlyoutToolbar
          frame={framePublicAPI}
          state={visualizationState}
          setState={setVisualizationState}
          isInlineEditing
        />
      </EuiForm>
    </EuiAccordion>
  );
}
