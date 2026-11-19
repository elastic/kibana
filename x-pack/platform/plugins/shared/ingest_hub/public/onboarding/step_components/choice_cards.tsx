/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ChoiceCardOption<T extends string> {
  value: T;
  /** Bold name shown on the card. */
  name: string;
  /** One line of help shown under the name. */
  description: string;
  /** Shows the "Recommended" badge next to the name. */
  isRecommended?: boolean;
}

interface ChoiceCardsProps<T extends string> {
  options: Array<ChoiceCardOption<T>>;
  /** The value of the checked card. */
  selectedValue: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Explains why the cards are disabled; shown on hover and focus while they are. */
  disabledTooltip?: string;
  /** Each card gets the test subject `<testSubjPrefix>-<value>`. */
  testSubjPrefix: string;
}

/** A row of radio cards, one per option: the one-of-few choices of the onboarding steps. */
export function ChoiceCards<T extends string>({
  options,
  selectedValue,
  onChange,
  disabled = false,
  disabledTooltip,
  testSubjPrefix,
}: ChoiceCardsProps<T>) {
  const radioGroupName = useGeneratedHtmlId({ prefix: 'choiceCards' });

  const cards = (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      {options.map((option) => (
        <EuiFlexItem key={option.value} style={{ minWidth: 280 }}>
          <EuiCheckableCard
            id={`${radioGroupName}-${option.value}`}
            name={radioGroupName}
            checkableType="radio"
            value={option.value}
            checked={option.value === selectedValue}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            data-test-subj={`${testSubjPrefix}-${option.value}`}
            label={
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <strong>{option.name}</strong>
                  </EuiFlexItem>
                  {option.isRecommended && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.ingestHub.choiceCards.recommended"
                          defaultMessage="Recommended"
                        />
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiText size="s" color="subdued">
                  {option.description}
                </EuiText>
              </>
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  // span needed: disabled cards have pointer-events:none; the span intercepts hover events and
  // keyboard focus (tabIndex) so the tooltip fires for mouse and keyboard users.
  return disabled && disabledTooltip ? (
    <EuiToolTip content={disabledTooltip} display="block">
      <span tabIndex={0} style={{ display: 'block' }}>
        {cards}
      </span>
    </EuiToolTip>
  ) : (
    cards
  );
}
