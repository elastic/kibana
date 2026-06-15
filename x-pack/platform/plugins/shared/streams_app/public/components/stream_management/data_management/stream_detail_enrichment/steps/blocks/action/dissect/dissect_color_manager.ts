/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EUI_COLOR_PALETTE_VALUES, type PatternColourPalette } from '@kbn/grok-ui';

export interface DissectFieldToken {
  fullMatch: string;
  fieldName: string;
  modifier?: string;
  rightPadding: boolean;
  orderSuffix?: number;
  startIndex: number;
  endIndex: number;
}

const DISSECT_TOKEN_REGEX = /%\{([^}]+)\}/g;
const LEFT_MODIFIERS = new Set(['+', '?', '*', '&']);

export const parseDissectFieldTokens = (pattern: string): DissectFieldToken[] => {
  const tokens: DissectFieldToken[] = [];
  DISSECT_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = DISSECT_TOKEN_REGEX.exec(pattern)) !== null) {
    let keyDef = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    let modifier: string | undefined;
    if (keyDef.length > 0 && LEFT_MODIFIERS.has(keyDef[0])) {
      modifier = keyDef[0];
      keyDef = keyDef.slice(1);
    }

    const rightPadding = keyDef.endsWith('->');
    if (rightPadding) {
      keyDef = keyDef.slice(0, -2);
    }

    let orderSuffix: number | undefined;
    const orderMatch = keyDef.match(/^(.+)\/(\d+)$/);
    if (orderMatch) {
      keyDef = orderMatch[1];
      orderSuffix = parseInt(orderMatch[2], 10);
    }

    const fieldName = keyDef.trim();
    if (!fieldName) continue;

    tokens.push({
      fullMatch: match[0],
      fieldName,
      modifier,
      rightPadding,
      orderSuffix,
      startIndex,
      endIndex,
    });
  }

  return tokens;
};

export class DissectColorManager {
  private fieldColourMap = new Map<string, PatternColourPalette>();
  private colourIndex = -1;
  private previousFieldNames: string[] = [];

  public updatePattern(pattern: string): void {
    const tokens = parseDissectFieldTokens(pattern);
    const currentFieldNames = tokens.map((t) => t.fieldName);
    const currentUniqueNames = new Set(currentFieldNames);

    const pendingTransfers = new Map<string, PatternColourPalette>();
    for (let i = 0; i < Math.max(this.previousFieldNames.length, currentFieldNames.length); i++) {
      const oldName = this.previousFieldNames[i];
      const newName = currentFieldNames[i];

      if (oldName && newName && oldName !== newName) {
        const oldColour = this.fieldColourMap.get(oldName);
        if (
          oldColour &&
          !this.fieldColourMap.has(newName) &&
          !pendingTransfers.has(newName) &&
          !currentUniqueNames.has(oldName)
        ) {
          pendingTransfers.set(newName, oldColour);
        }
      }
    }

    for (const [name, colour] of pendingTransfers) {
      this.fieldColourMap.set(name, colour);
    }

    for (const name of currentUniqueNames) {
      if (!this.fieldColourMap.has(name)) {
        this.fieldColourMap.set(name, this.nextColour());
      }
    }

    for (const name of [...this.fieldColourMap.keys()]) {
      if (!currentUniqueNames.has(name)) {
        this.fieldColourMap.delete(name);
      }
    }

    this.previousFieldNames = currentFieldNames;
  }

  public getFieldColourMap(): Map<string, PatternColourPalette> {
    return this.fieldColourMap;
  }

  public getTokens(pattern: string): DissectFieldToken[] {
    return parseDissectFieldTokens(pattern);
  }

  private nextColour(): PatternColourPalette {
    this.colourIndex = (this.colourIndex + 1) % EUI_COLOR_PALETTE_VALUES.length;
    return EUI_COLOR_PALETTE_VALUES[this.colourIndex];
  }
}
