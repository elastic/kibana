/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface PatternSegment {
  type: 'static' | 'wildcard';
  value: string;
  index?: number;
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

const countWildcards = (pattern: string): number => {
  return (pattern.match(/\*/g) || []).length;
};

const buildStreamName = (pattern: string, parts: string[]): string => {
  let result = pattern;
  parts.forEach((part) => {
    // Keep * if the part is empty, so validation can detect unfilled wildcards
    result = result.replace('*', part || '*');
  });
  return result;
};

export type ValidationErrorType = 'empty' | 'duplicate' | 'higherPriority' | null;

export interface StreamNameInputProps {
  /** The index pattern containing wildcards (e.g., "*-logs-*-*") */
  indexPattern: string;
  /** Callback when the stream name changes */
  onChange: (streamName: string) => void;
  /** Validation error type - shows error state on all wildcard inputs when not null */
  validationError?: ValidationErrorType;
  /** Test subject prefix for the inputs */
  'data-test-subj'?: string;
}

export const StreamNameInput = ({
  indexPattern,
  onChange,
  validationError = null,
  'data-test-subj': dataTestSubj = 'streamNameInput',
}: StreamNameInputProps) => {
  const { euiTheme } = useEuiTheme();

  const segments = useMemo(() => parseIndexPattern(indexPattern), [indexPattern]);
  const wildcardCount = useMemo(() => countWildcards(indexPattern), [indexPattern]);

  // Internal state for wildcard values
  const [parts, setParts] = useState<string[]>(() => Array(wildcardCount).fill(''));

  // Reset parts when index pattern changes
  useEffect(() => {
    setParts(Array(wildcardCount).fill(''));
  }, [indexPattern, wildcardCount]);

  // Update stream name when wildcard values change
  useEffect(() => {
    const streamName = buildStreamName(indexPattern, parts);
    onChange(streamName);
  }, [indexPattern, parts, onChange]);

  const handleWildcardChange = useCallback((wildcardIndex: number, newValue: string) => {
    setParts((prevParts) => {
      const newParts = [...prevParts];
      while (newParts.length <= wildcardIndex) {
        newParts.push('');
      }
      newParts[wildcardIndex] = newValue;
      return newParts;
    });
  }, []);

  const inputGroupStyles = css`
    row-gap: ${euiTheme.size.xs};
  `;

  const getInputStyles = (isFirst: boolean, isLast: boolean) => {
    const borderRadius = euiTheme.border.radius.medium;
    const firstRadiusStyle = `border-top-left-radius: ${borderRadius}; border-bottom-left-radius: ${borderRadius};`;
    const lastRadiusStyle = `border-top-right-radius: ${borderRadius}; border-bottom-right-radius: ${borderRadius};`;

    return css`
      border-radius: 0;
      ${isFirst ? firstRadiusStyle : ''}
      ${isLast ? lastRadiusStyle : ''}
    `;
  };

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      wrap
      css={inputGroupStyles}
      data-test-subj={dataTestSubj}
    >
      {segments.map((segment, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === segments.length - 1;

        if (segment.type === 'static') {
          return (
            <EuiFlexItem key={`static-${idx}`} grow={1}>
              <EuiFieldText
                value={segment.value}
                readOnly
                data-test-subj={`${dataTestSubj}-static-${idx}`}
                css={getInputStyles(isFirst, isLast)}
              />
            </EuiFlexItem>
          );
        }

        const wildcardIdx = segment.index ?? 0;
        const hasError = validationError !== null;

        return (
          <EuiFlexItem
            key={`wildcard-${wildcardIdx}`}
            grow={2}
            css={css`
              min-width: 100px;
            `}
          >
            <EuiFieldText
              value={parts[wildcardIdx] ?? ''}
              onChange={(e) => handleWildcardChange(wildcardIdx, e.target.value)}
              placeholder="*"
              fullWidth
              isInvalid={hasError}
              data-test-subj={`${dataTestSubj}-wildcard-${wildcardIdx}`}
              css={getInputStyles(isFirst, isLast)}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
