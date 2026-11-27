/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckableCard,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { CardLabel } from './form_layout';
import type { ProfileFormValues } from './profile_form_values';
import {
  ONE_EXTRA_COPY_DESCRIPTION,
  ONE_EXTRA_COPY_LABEL,
  PINNED_DESCRIPTION,
  PINNED_LABEL,
  PINNED_NEEDS_PREWARM_TOOLTIP,
  PREWARM_DESCRIPTION,
  PREWARM_LABEL,
} from './translations';

export interface IndicesOptionsProps {
  control: Control<ProfileFormValues>;
  isDisabled: boolean;
}

export const IndicesOptions = ({ control, isDisabled }: IndicesOptionsProps) => {
  const idPrefix = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutOption' });
  const { field: oneExtraCopyField } = useController({ control, name: 'indices.oneExtraCopy' });
  const { field: prewarmField } = useController({ control, name: 'indices.prewarm' });
  const { field: pinnedField } = useController({ control, name: 'indices.pinned' });
  const isPrewarmOn = prewarmField.value;
  const pinnedDescriptionId = `${idPrefix}-pinnedDescription`;
  const pinnedReasonId = `${idPrefix}-pinnedReason`;

  const pinnedCheckbox = (
    <EuiCheckbox
      id={`${idPrefix}-pinned`}
      label={
        <>
          {PINNED_LABEL}
          <EuiText id={pinnedDescriptionId} size="xs" color="subdued">
            {PINNED_DESCRIPTION}
          </EuiText>
        </>
      }
      checked={pinnedField.value}
      disabled={isDisabled || !isPrewarmOn}
      aria-hidden={!isPrewarmOn || undefined}
      onChange={(event) => pinnedField.onChange(event.target.checked)}
      data-test-subj="searchBoostProfileFlyoutPinned"
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiCheckableCard
          id={`${idPrefix}-oneExtraCopy`}
          checkableType="checkbox"
          label={
            <CardLabel title={ONE_EXTRA_COPY_LABEL} description={ONE_EXTRA_COPY_DESCRIPTION} />
          }
          checked={oneExtraCopyField.value}
          disabled={isDisabled}
          onChange={(event) => oneExtraCopyField.onChange(event.target.checked)}
          data-test-subj="searchBoostProfileFlyoutOneExtraCopy"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCheckableCard
          id={`${idPrefix}-prewarm`}
          checkableType="checkbox"
          label={<CardLabel title={PREWARM_LABEL} description={PREWARM_DESCRIPTION} />}
          checked={isPrewarmOn}
          disabled={isDisabled}
          onChange={(event) => {
            const { checked } = event.target;
            prewarmField.onChange(checked);
            if (!checked) {
              pinnedField.onChange(false);
            }
          }}
          data-test-subj="searchBoostProfileFlyoutPrewarm"
        >
          {isPrewarmOn ? (
            pinnedCheckbox
          ) : (
            <EuiToolTip
              content={PINNED_NEEDS_PREWARM_TOOLTIP}
              // The tooltip only links its text while it's shown, which is too late for screen
              // readers announcing the focused wrapper, so the wrapper links the hidden copy below.
              disableScreenReaderOutput
              anchorProps={{ 'data-test-subj': 'searchBoostProfileFlyoutPinnedTip' }}
            >
              {/* A disabled checkbox can't take focus, so this wrapper stands in for it, for
               keyboard and screen reader users, while the checkbox inside only shows its disabled
               look. */}
              <div
                tabIndex={0}
                role="checkbox"
                aria-checked={pinnedField.value}
                aria-disabled={true}
                aria-label={PINNED_LABEL}
                aria-describedby={`${pinnedDescriptionId} ${pinnedReasonId}`}
                data-test-subj="searchBoostProfileFlyoutPinnedTrigger"
              >
                {pinnedCheckbox}
                <span id={pinnedReasonId} hidden>
                  {PINNED_NEEDS_PREWARM_TOOLTIP}
                </span>
              </div>
            </EuiToolTip>
          )}
        </EuiCheckableCard>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
