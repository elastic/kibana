/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  parseIndexPattern,
  createInputGroups,
  type ValidationErrorType,
  countWildcards,
} from '../../utils';

export interface StreamNameInputProps {
  /** The index pattern containing wildcards (e.g., "*-logs-*-*") */
  indexPattern: string;
  /** Current wildcard part values (controlled) */
  parts: string[];
  /** Callback when wildcard parts change */
  onPartsChange: (parts: string[]) => void;
  /**
   * Validation error type. When 'empty', only empty inputs are highlighted.
   * For other error types, all inputs are highlighted.
   */
  validationError?: ValidationErrorType;
  /** Test subject prefix for the inputs */
  'data-test-subj'?: string;
}

export const StreamNameInput = ({
  indexPattern,
  parts,
  onPartsChange,
  validationError = null,
  'data-test-subj': dataTestSubj = 'streamNameInput',
}: StreamNameInputProps) => {
  const { euiTheme } = useEuiTheme();

  const segments = useMemo(() => parseIndexPattern(indexPattern), [indexPattern]);
  const inputGroups = useMemo(() => createInputGroups(segments), [segments]);

  const handleWildcardChange = useCallback(
    (wildcardIndex: number, newValue: string) => {
      const newParts = [...parts];
      while (newParts.length <= wildcardIndex) {
        newParts.push('');
      }
      newParts[wildcardIndex] = newValue;
      onPartsChange(newParts);
    },
    [parts, onPartsChange]
  );

  const hasMultipleWildcards = inputGroups.length > 1;

  // Determine if a specific input should be marked as invalid
  const isInputInvalid = useCallback(
    (wildcardIndex: number): boolean => {
      if (!validationError) return false;
      if (validationError === 'empty') {
        // Only highlight empty inputs
        return !parts[wildcardIndex]?.trim();
      }
      // For other errors (duplicate, higherPriority), highlight all inputs
      return true;
    },
    [validationError, parts]
  );

  const getConnectedInputStyles = (isFirst: boolean, isLast: boolean, isInvalid: boolean) => {
    return css`
      flex: 1 1 0%;

      /* Ensure the wildcard input is at least 100px wide */
      .euiFormControlLayout__childrenWrapper {
        min-width: 100px;
      }

      /* Remove border radius on connected sides */
      .euiFormControlLayout,
      .euiFieldText {
        ${!isLast ? 'border-top-right-radius: 0 ; border-bottom-right-radius: 0 ;' : ''}
        ${!isFirst ? 'border-top-left-radius: 0 ; border-bottom-left-radius: 0 ;' : ''}
      }

      /* Remove border on connected sides to prevent double borders */
      /* We use margin-right: -1px to overlap borders, but not when invalid */
      /* because the outline needs to be fully visible on all sides */
      ${!isLast && !isInvalid ? 'margin-right: -1px;' : ''}

      /* Ensure the focused element is on top */
      &:focus-within {
        z-index: 1;
      }

      /* Prevent truncation on labels */
      .euiFormControlLayout__prepend,
      .euiFormControlLayout__append {
        max-width: none;
      }
    `;
  };

  const getInputGroupStyles = () => css`
    row-gap: ${euiTheme.size.xs};
  `;

  // If there are no wildcards, show the index pattern as a read-only field
  if (countWildcards(indexPattern) === 0) {
    return (
      <EuiFieldText
        value={indexPattern}
        readOnly
        fullWidth
        data-test-subj={`${dataTestSubj}-readonly`}
      />
    );
  }

  // For single wildcard, use simple prepend/append
  if (!hasMultipleWildcards && inputGroups.length === 1) {
    const group = inputGroups[0];
    return (
      <EuiFieldText
        autoFocus
        value={parts[group.wildcardIndex] ?? ''}
        onChange={(e) => handleWildcardChange(group.wildcardIndex, e.target.value)}
        placeholder="*"
        fullWidth
        isInvalid={isInputInvalid(group.wildcardIndex)}
        prepend={group.prepend}
        append={group.append}
        aria-label={i18n.translate(
          'xpack.createClassicStreamFlyout.streamNameInput.singleWildcardAriaLabel',
          {
            defaultMessage: 'Stream name',
          }
        )}
        data-test-subj={`${dataTestSubj}-wildcard-${group.wildcardIndex}`}
      />
    );
  }

  // For multiple wildcards, use flex layout with prepend/append on each input
  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      wrap
      css={getInputGroupStyles()}
      data-test-subj={dataTestSubj}
    >
      {inputGroups.map((group, index) => {
        const isFirst = index === 0;
        const isLast = index === inputGroups.length - 1;
        const isInvalid = isInputInvalid(group.wildcardIndex);

        return (
          <EuiFlexItem
            key={`wildcard-${group.wildcardIndex}`}
            css={getConnectedInputStyles(isFirst, isLast, isInvalid)}
          >
            <EuiFieldText
              autoFocus={isFirst}
              value={parts[group.wildcardIndex] ?? ''}
              onChange={(e) => handleWildcardChange(group.wildcardIndex, e.target.value)}
              placeholder="*"
              fullWidth
              isInvalid={isInvalid}
              prepend={group.prepend}
              append={group.append}
              aria-label={i18n.translate(
                'xpack.createClassicStreamFlyout.streamNameInput.wildcardAriaLabel',
                {
                  defaultMessage: 'Stream name part {index} of {total}',
                  values: { index: index + 1, total: inputGroups.length },
                }
              )}
              data-test-subj={`${dataTestSubj}-wildcard-${group.wildcardIndex}`}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
