/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ValidationErrorType } from '../../utils';

/*
 * PatternSegment is a segment of the index pattern that is either a static text or a wildcard.
 * It is used to create the input groups.
 */
interface PatternSegment {
  type: 'static' | 'wildcard';
  value: string;
  index?: number;
}

/**
 * Groups segments into input groups where each group has:
 * - prepend: static text before the wildcard (if any)
 * - wildcardIndex: the index of the wildcard
 * - append: static text after the wildcard (if any, and only if it's the last wildcard)
 */
interface InputGroup {
  prepend?: string;
  wildcardIndex: number;
  append?: string;
  isFirst: boolean;
  isLast: boolean;
}

const parseIndexPattern = (pattern: string): PatternSegment[] => {
  if (!pattern) return [];

  const segments: PatternSegment[] = [];
  let currentSegment = '';
  let wildcardIndex = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*') {
      if (currentSegment) {
        segments.push({ type: 'static', value: currentSegment });
        currentSegment = '';
      }
      segments.push({ type: 'wildcard', value: '*', index: wildcardIndex });
      wildcardIndex++;
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push({ type: 'static', value: currentSegment });
  }

  return segments;
};

const createInputGroups = (segments: PatternSegment[]): InputGroup[] => {
  const groups: InputGroup[] = [];
  let pendingPrepend: string | undefined;
  const wildcardCount = segments.filter((s) => s.type === 'wildcard').length;
  let currentWildcardNum = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.type === 'static') {
      // Check if next segment is a wildcard
      const nextSegment = segments[i + 1];
      if (nextSegment?.type === 'wildcard') {
        // This static text becomes the prepend for the next wildcard
        pendingPrepend = segment.value;
      } else {
        // This is trailing static text - append to the last group
        if (groups.length > 0) {
          groups[groups.length - 1].append = segment.value;
        }
      }
    } else if (segment.type === 'wildcard') {
      currentWildcardNum++;
      groups.push({
        prepend: pendingPrepend,
        wildcardIndex: segment.index ?? 0,
        isFirst: currentWildcardNum === 1,
        isLast: currentWildcardNum === wildcardCount,
      });
      pendingPrepend = undefined;
    }
  }

  return groups;
};

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

  const getConnectedInputStyles = (isFirst: boolean, isLast: boolean) => {
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

  // For single wildcard, use simple prepend/append
  if (!hasMultipleWildcards && inputGroups.length === 1) {
    const group = inputGroups[0];
    return (
      <EuiFieldText
        value={parts[group.wildcardIndex] ?? ''}
        onChange={(e) => handleWildcardChange(group.wildcardIndex, e.target.value)}
        placeholder="*"
        fullWidth
        isInvalid={isInputInvalid(group.wildcardIndex)}
        prepend={group.prepend}
        append={group.append}
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

        return (
          <EuiFlexItem
            key={`wildcard-${group.wildcardIndex}`}
            css={getConnectedInputStyles(isFirst, isLast)}
          >
            <EuiFieldText
              value={parts[group.wildcardIndex] ?? ''}
              onChange={(e) => handleWildcardChange(group.wildcardIndex, e.target.value)}
              placeholder="*"
              fullWidth
              isInvalid={isInputInvalid(group.wildcardIndex)}
              prepend={group.prepend}
              append={group.append}
              data-test-subj={`${dataTestSubj}-wildcard-${group.wildcardIndex}`}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
