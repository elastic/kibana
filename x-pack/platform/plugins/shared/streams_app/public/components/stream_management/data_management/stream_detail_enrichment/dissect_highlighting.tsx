/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, EuiToolTip } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';

// Same color palette as GROK for consistency
const EUI_COLOR_PALETTE_VALUES = [
  'Primary',
  'Accent',
  'AccentSecondary',
  'Success',
  'Warning',
  'Risk',
  'Danger',
];

// --- Types ---

interface DissectFieldToken {
  type: 'field';
  name: string;
  color: string;
  isSkip: boolean;
  hasRightPadding: boolean;
}

interface DissectLiteralToken {
  type: 'literal';
  value: string;
}

type DissectToken = DissectFieldToken | DissectLiteralToken;

interface DissectHighlightSpan {
  startIndex: number;
  endIndex: number;
  fieldName: string;
  color: string;
  isSkip: boolean;
}

interface DissectHighlightContextValue {
  tokens: DissectToken[];
}

// --- Tokenizer ---

/**
 * Parses a dissect pattern into an ordered array of tokens (literals and fields),
 * assigning colors from the EUI palette to each field token.
 */
export function parseDissectTokens(pattern: string): DissectToken[] {
  const tokens: DissectToken[] = [];
  const fieldColorMap = new Map<string, string>();
  let colorIndex = 0;

  const regex = /%\{([^}]*)}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(pattern)) !== null) {
    // Add literal before this field
    if (match.index > lastIndex) {
      tokens.push({ type: 'literal', value: pattern.slice(lastIndex, match.index) });
    }

    let keyDefinition = match[1];
    if (!keyDefinition) {
      // Empty field %{} — anonymous skip
      tokens.push({
        type: 'field',
        name: '',
        color: 'Subdued',
        isSkip: true,
        hasRightPadding: false,
      });
      lastIndex = regex.lastIndex;
      continue;
    }

    // Check left modifier
    const firstChar = keyDefinition[0];
    const isSkip = firstChar === '?' || firstChar === '*' || firstChar === '&';
    const isAppend = firstChar === '+';

    if (firstChar === '?' || firstChar === '+' || firstChar === '*' || firstChar === '&') {
      keyDefinition = keyDefinition.slice(1);
    }

    // Check right padding modifier
    const hasRightPadding = keyDefinition.endsWith('->');
    if (hasRightPadding) {
      keyDefinition = keyDefinition.slice(0, -2);
    }

    // Check order specifier /n
    const orderMatch = keyDefinition.match(/^(.+)\/(\d+)$/);
    if (orderMatch) {
      keyDefinition = orderMatch[1];
    }

    keyDefinition = keyDefinition.trim();
    if (!keyDefinition) {
      tokens.push({
        type: 'field',
        name: '',
        color: 'Subdued',
        isSkip: true,
        hasRightPadding,
      });
      lastIndex = regex.lastIndex;
      continue;
    }

    // Assign color
    let color: string;
    if (isSkip) {
      color = 'Subdued';
    } else if (isAppend && fieldColorMap.has(keyDefinition)) {
      color = fieldColorMap.get(keyDefinition)!;
    } else if (fieldColorMap.has(keyDefinition)) {
      color = fieldColorMap.get(keyDefinition)!;
    } else {
      color = EUI_COLOR_PALETTE_VALUES[colorIndex % EUI_COLOR_PALETTE_VALUES.length];
      colorIndex++;
      fieldColorMap.set(keyDefinition, color);
    }

    tokens.push({
      type: 'field',
      name: keyDefinition,
      color,
      isSkip,
      hasRightPadding,
    });

    lastIndex = regex.lastIndex;
  }

  // Trailing literal
  if (lastIndex < pattern.length) {
    tokens.push({ type: 'literal', value: pattern.slice(lastIndex) });
  }

  return tokens;
}

// --- Matcher ---

/**
 * Matches a sample string against parsed dissect tokens and returns highlight spans
 * for each field extraction.
 */
export function matchDissectSample(
  sample: string,
  tokens: DissectToken[]
): DissectHighlightSpan[] | null {
  if (tokens.length === 0) return null;

  const spans: DissectHighlightSpan[] = [];
  let pos = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'literal') {
      const idx = sample.indexOf(token.value, pos);
      if (idx === -1) return null; // Pattern doesn't match
      pos = idx + token.value.length;
    } else {
      // Field token — find the end boundary
      const fieldStart = pos;
      let fieldEnd: number;

      // Find the next literal token to determine field boundary
      const nextLiteralIndex = findNextLiteral(tokens, i + 1);

      if (nextLiteralIndex === -1) {
        // No more literals — field consumes rest of string
        fieldEnd = sample.length;
      } else {
        const nextLiteral = tokens[nextLiteralIndex] as DissectLiteralToken;
        const literalPos = sample.indexOf(nextLiteral.value, pos);
        if (literalPos === -1) return null; // Pattern doesn't match
        fieldEnd = literalPos;
      }

      // Handle right padding: the highlight span should exclude trailing whitespace,
      // but we still advance pos past the padding.
      let highlightEnd = fieldEnd;
      if (token.hasRightPadding && fieldEnd > fieldStart) {
        while (highlightEnd > fieldStart && /\s/.test(sample[highlightEnd - 1])) {
          highlightEnd--;
        }
      }

      if (highlightEnd > fieldStart) {
        spans.push({
          startIndex: fieldStart,
          endIndex: highlightEnd,
          fieldName: token.name,
          color: token.color,
          isSkip: token.isSkip,
        });
      }

      pos = fieldEnd;
    }
  }

  return spans.length > 0 ? spans : null;
}

function findNextLiteral(tokens: DissectToken[], startIndex: number): number {
  for (let i = startIndex; i < tokens.length; i++) {
    if (tokens[i].type === 'literal') return i;
  }
  return -1;
}

// --- Color palette styles ---

export function getDissectColourPaletteStyles(
  euiTheme: EuiThemeComputed
): Record<string, { backgroundColor: string; color: string; cursor: string }> {
  const styles: Record<string, { backgroundColor: string; color: string; cursor: string }> = {};

  for (const colour of EUI_COLOR_PALETTE_VALUES) {
    styles[`.dissect-field-match-${colour}`] = {
      backgroundColor: euiTheme.colors[
        `backgroundLight${colour}` as keyof EuiThemeComputed['colors']
      ] as string,
      color: euiTheme.colors[`text${colour}` as keyof EuiThemeComputed['colors']] as string,
      cursor: 'pointer',
    };
  }

  // Subdued style for skip/reference fields
  styles['.dissect-field-match-Subdued'] = {
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    color: euiTheme.colors.textSubdued,
    cursor: 'default',
  };

  return styles;
}

export function colourToClassName(colour: string) {
  return `dissect-field-match-${colour}`;
}

// --- Context ---

const DissectHighlightContext = createContext<DissectHighlightContextValue | undefined>(undefined);

interface DissectHighlightProviderProps {
  pattern: string;
  children: React.ReactNode;
}

export const DissectHighlightProvider = ({ pattern, children }: DissectHighlightProviderProps) => {
  const tokens = useMemo(() => parseDissectTokens(pattern), [pattern]);

  return (
    <DissectHighlightContext.Provider value={{ tokens }}>
      {children}
    </DissectHighlightContext.Provider>
  );
};

export const useDissectHighlight = () => {
  const context = useContext(DissectHighlightContext);
  if (context === undefined) {
    throw new Error('useDissectHighlight must be used within a DissectHighlightProvider');
  }
  return context;
};

// --- Sample component ---

interface DissectSampleProps {
  sample: string;
}

export const DissectSample = ({ sample }: DissectSampleProps) => {
  const eui = useEuiTheme();
  const { tokens } = useDissectHighlight();

  const colourPaletteStyles = useMemo(
    () => getDissectColourPaletteStyles(eui.euiTheme),
    [eui.euiTheme]
  );

  const highlights = useMemo(() => matchDissectSample(sample, tokens), [sample, tokens]);

  if (!sample) {
    return <>&nbsp;</>;
  }

  if (!highlights || highlights.length === 0) {
    return <>{sample}</>;
  }

  return (
    <div
      css={css`
        .dissect-pattern-match {
          background-color: ${eui.euiTheme.colors.highlight};
        }
        ${colourPaletteStyles}
        white-space: pre-wrap;
      `}
    >
      <div>{renderHighlightedSample(sample, highlights)}</div>
    </div>
  );
};

function renderHighlightedSample(
  sample: string,
  highlights: DissectHighlightSpan[]
): React.ReactNode {
  const parts: React.ReactNode[] = [];

  // Start from the beginning — leading literals are part of the dissect pattern too
  let pos = 0;
  for (let i = 0; i < highlights.length; i++) {
    const hl = highlights[i];

    // Literal text between fields (delimiters)
    if (pos < hl.startIndex) {
      parts.push(
        <span key={`lit-${pos}`} className="dissect-pattern-match">
          {sample.slice(pos, hl.startIndex)}
        </span>
      );
    }

    // Field highlight
    const fieldSpan = (
      <span key={`field-${hl.startIndex}`} className={colourToClassName(hl.color)}>
        {sample.slice(hl.startIndex, hl.endIndex)}
      </span>
    );

    if (hl.fieldName) {
      parts.push(
        <EuiToolTip
          key={`tt-${hl.startIndex}`}
          position="top"
          content={
            <p>
              {hl.isSkip ? 'Skip field: ' : 'Field: '}
              {hl.fieldName}
            </p>
          }
        >
          {fieldSpan}
        </EuiToolTip>
      );
    } else {
      parts.push(fieldSpan);
    }

    pos = hl.endIndex;
  }

  // Trailing literal after the last field — still part of the dissect pattern
  if (pos < sample.length) {
    parts.push(
      <span key={`lit-${pos}`} className="dissect-pattern-match">
        {sample.slice(pos)}
      </span>
    );
  }

  return parts;
}

// --- Helpers for integration ---

/**
 * Checks if a dissect pattern extracts into a field with the same name as the source field.
 */
export function dissectPatternOverwritesSourceField(
  pattern: string,
  sourceField: string
): boolean {
  const regex = /%\{([^}]*)}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(pattern)) !== null) {
    let keyDefinition = match[1];
    if (!keyDefinition) continue;

    // Strip left modifiers
    const firstChar = keyDefinition[0];
    if (firstChar === '?' || firstChar === '+' || firstChar === '*' || firstChar === '&') {
      keyDefinition = keyDefinition.slice(1);
    }

    // Skip fields don't output
    if (firstChar === '?') continue;

    // Strip right padding
    if (keyDefinition.endsWith('->')) {
      keyDefinition = keyDefinition.slice(0, -2);
    }

    // Strip order specifier
    const orderMatch = keyDefinition.match(/^(.+)\/(\d+)$/);
    if (orderMatch) {
      keyDefinition = orderMatch[1];
    }

    keyDefinition = keyDefinition.trim();
    if (keyDefinition === sourceField) return true;
  }

  return false;
}
