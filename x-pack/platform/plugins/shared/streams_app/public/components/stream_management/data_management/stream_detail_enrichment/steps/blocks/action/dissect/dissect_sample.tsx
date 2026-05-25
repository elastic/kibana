/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import {
  colourToClassName,
  getColourPaletteStyles,
  applyHighlights,
  type HighlightConfiguration,
  type PatternColourPalette,
} from '@kbn/grok-ui';
import { parseDissectFieldTokens } from './dissect_color_manager';

interface DissectSampleProps {
  sample: string;
  pattern: string;
  fieldColourMap: Map<string, PatternColourPalette>;
}

/**
 * Renders a sample text string with colored highlights matching the dissect pattern.
 * Each extracted field is highlighted with the same color used in the pattern editor.
 */
export const DissectSample = ({ sample, pattern, fieldColourMap }: DissectSampleProps) => {
  const { euiTheme } = useEuiTheme();

  const colourPaletteStyles = useMemo(() => getColourPaletteStyles(euiTheme), [euiTheme]);

  const highlightedSample = useMemo(() => {
    if (!sample || !pattern) return sample;

    const regexResult = dissectPatternToRegex(pattern);
    if (!regexResult) return sample;

    const { regex, groupToFieldName } = regexResult;

    let match: RegExpExecArray | null;
    try {
      match = regex.exec(sample);
    } catch {
      return sample;
    }

    if (!match?.indices?.groups) return sample;

    const highlights: HighlightConfiguration[] = [];

    for (const [groupName, indices] of Object.entries(match.indices.groups)) {
      if (!indices) continue;
      const [startIndex, endIndex] = indices;
      const fieldName = groupToFieldName.get(groupName);
      if (!fieldName) continue;

      const colour = fieldColourMap.get(fieldName);
      if (!colour) continue;

      highlights.push({
        startIndex,
        endIndex,
        className: colourToClassName(colour),
        tooltipContent: buildFieldTooltip(fieldName),
      });
    }

    return applyHighlights(sample, highlights);
  }, [sample, pattern, fieldColourMap]);

  if (!sample) {
    return <>&nbsp;</>;
  }

  return (
    <div
      css={css`
        ${colourPaletteStyles}
        white-space: pre-wrap;
      `}
    >
      {highlightedSample}
    </div>
  );
};

const buildFieldTooltip = (fieldName: string) => <p>{fieldName}</p>;

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface DissectRegexResult {
  regex: RegExp;
  groupToFieldName: Map<string, string>;
}

/**
 * Converts a dissect pattern into a RegExp with named capture groups and the `d` flag
 * for extracting group index positions from a matched sample string.
 *
 * Each `%{field}` token becomes a named group `(?<_fN>...)` where N is the token index.
 * Literal text between tokens is regex-escaped. The last token before end-of-string
 * uses a greedy quantifier; all others use non-greedy.
 */
export const dissectPatternToRegex = (pattern: string): DissectRegexResult | null => {
  const tokens = parseDissectFieldTokens(pattern);
  if (tokens.length === 0) return null;

  const groupToFieldName = new Map<string, string>();
  let regexStr = '';
  let lastEnd = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const literal = pattern.slice(lastEnd, token.startIndex);
    regexStr += escapeRegExp(literal);

    const groupName = `_f${i}`;
    groupToFieldName.set(groupName, token.fieldName);

    const isLast = i === tokens.length - 1;
    const trailingLiteral = isLast ? pattern.slice(token.endIndex) : '';

    if (token.rightPadding) {
      regexStr += `(?<${groupName}>.+?)\\s*`;
    } else if (isLast && trailingLiteral === '') {
      regexStr += `(?<${groupName}>.+)`;
    } else {
      regexStr += `(?<${groupName}>.+?)`;
    }

    lastEnd = token.endIndex;
  }

  const trailing = pattern.slice(lastEnd);
  regexStr += escapeRegExp(trailing);

  try {
    return { regex: new RegExp(regexStr, 'd'), groupToFieldName };
  } catch {
    return null;
  }
};
