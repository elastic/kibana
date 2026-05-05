/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiAccordion, EuiForm, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { FramePublicAPI, Visualization } from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface LegendAccordionProps {
  activeVisualization: Visualization;
  visualizationState: unknown;
  setVisualizationState: (newState: unknown) => void;
  framePublicAPI: FramePublicAPI;
  isAccordionOpen: boolean;
  onAccordionToggle: (isOpenNext: boolean) => void;
}

export function LegendAccordion({
  activeVisualization,
  visualizationState,
  setVisualizationState,
  framePublicAPI,
  isAccordionOpen,
  onAccordionToggle,
}: LegendAccordionProps) {
  const { euiTheme } = useEuiTheme();
  const FlyoutLegend = activeVisualization.FlyoutLegendComponent;

  if (!FlyoutLegend) {
    return null;
  }

  return (
    <EuiAccordion
      id="lens-legend"
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
            {i18n.translate('xpack.lens.inlineLegend.accordionTitle', {
              defaultMessage: 'Legend',
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
      data-test-subj="lensLegendAccordion"
    >
      <EuiForm
        fullWidth
        data-test-subj="lensInlineLegendForm"
        css={css`
          padding: 0 0 ${euiTheme.size.base};
        `}
      >
        <FlyoutLegend
          frame={framePublicAPI}
          state={visualizationState}
          setState={setVisualizationState}
          isInlineEditing
        />
      </EuiForm>
    </EuiAccordion>
  );
}
