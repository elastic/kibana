/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ReasoningEffortLevel } from '../../../common/types';
import { AddEffortBadge } from './add_effort_badge';
import { EditEffortBadge } from './edit_effort_badge';
import { ReasoningEffortButtonGroup } from './reasoning_effort_button_group';

const popoverPanelStyles = ({ euiTheme }: UseEuiTheme) => ({
  minWidth: euiTheme.base * 30,
});

const selectorStyles = css`
  align-self: stretch;
`;

interface ReasoningEffortPopoverProps {
  endpointId: string;
  label: string;
  effort?: ReasoningEffortLevel;
  supportedLevels: ReasoningEffortLevel[];
  onChange: (effort?: ReasoningEffortLevel) => void;
}

export const ReasoningEffortPopover: React.FC<ReasoningEffortPopoverProps> = ({
  endpointId,
  label,
  effort,
  supportedLevels,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const togglePopover = () => setIsOpen((open) => !open);

  return (
    <EuiPopover
      button={
        effort === undefined ? (
          <AddEffortBadge
            endpointId={endpointId}
            label={label}
            isPopoverOpen={isOpen}
            onClick={togglePopover}
          />
        ) : (
          <EditEffortBadge
            endpointId={endpointId}
            label={label}
            effort={effort}
            onClick={togglePopover}
          />
        )
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelProps={{ css: popoverPanelStyles }}
      aria-labelledby={popoverTitleId}
      data-test-subj={`effort-popover-${endpointId}`}
    >
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3 id={popoverTitleId}>
              {i18n.translate('xpack.searchInferenceEndpoints.settings.reasoningEffort.title', {
                defaultMessage: 'Reasoning effort',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {supportedLevels.length > 0 && (
          <EuiFlexItem grow={false} css={selectorStyles}>
            <ReasoningEffortButtonGroup
              effort={effort}
              supportedLevels={supportedLevels}
              onChange={onChange}
            />
          </EuiFlexItem>
        )}
        {effort !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              size="xs"
              flush="left"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              data-test-subj="remove-effort-customization"
            >
              {i18n.translate('xpack.searchInferenceEndpoints.settings.reasoningEffort.remove', {
                defaultMessage: 'Remove effort customization',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
};
