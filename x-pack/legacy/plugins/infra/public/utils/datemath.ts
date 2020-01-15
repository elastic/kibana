/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath, { Unit } from '@elastic/datemath';

export function isValidDatemath(value: string): boolean {
  const parsedValue = dateMath.parse(value);
  return !!(parsedValue && parsedValue.isValid());
}

export function datemathToEpochMillis(value: string): number | null {
  const parsedValue = dateMath.parse(value);
  if (!parsedValue || !parsedValue.isValid()) {
    return null;
  }
  return parsedValue.valueOf();
}

type DatemathExtension =
  | {
      value: string;
      diffUnit: Unit;
      diffAmount: number;
    }
  | { value: 'now' }
  | undefined;

const datemathNowExpression = /(\+|\-)(\d+)(ms|s|m|h|d|w|M|y)$/;

export function extendDatemath(
  value: string,
  direction: 'before' | 'after' = 'before'
): DatemathExtension {
  if (!isValidDatemath(value)) {
    return undefined;
  }

  if (value === 'now') {
    return { value: 'now' };
  }

  if (value.startsWith('now')) {
    const [, operator, amount, unit] = datemathNowExpression.exec(value) || [];
    if (!operator || !amount || !unit) {
      return undefined;
    }

    const mustIncreaseAmount = operator === '-' && direction === 'before';
    const parsedAmount = parseInt(amount, 10);
    let newUnit: Unit = unit as Unit;
    let newAmount: number;

    switch (unit) {
      case 'ms':
      case 's':
        newAmount = mustIncreaseAmount ? parsedAmount * 2 : Math.floor(parsedAmount / 2);
        break;
      case 'm':
        let ratio;
        if (mustIncreaseAmount) {
          ratio = parsedAmount >= 10 ? 0.5 : 1;
          newAmount = parsedAmount + parsedAmount * ratio;
        } else {
          newAmount =
            parsedAmount >= 10 ? Math.floor(parsedAmount / 1.5) : parsedAmount - parsedAmount * 0.5;
        }
        break;
      case 'h':
        if (parsedAmount === 1) {
          newAmount = mustIncreaseAmount ? 90 : 30;
          newUnit = 'm';
        } else {
          newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
        }
        break;
      case 'd':
        if (parsedAmount === 1) {
          newAmount = mustIncreaseAmount ? 25 : 23;
          newUnit = 'h';
        } else {
          newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
        }
        break;

      case 'w':
        if (parsedAmount === 1) {
          newAmount = mustIncreaseAmount ? 8 : 6;
          newUnit = 'd';
        } else {
          newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
        }
        break;

      case 'M':
        if (parsedAmount === 1) {
          newAmount = mustIncreaseAmount ? 5 : 3;
          newUnit = 'w';
        } else {
          newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
        }
        break;

      case 'y':
        if (parsedAmount === 1) {
          newAmount = mustIncreaseAmount ? 13 : 11;
          newUnit = 'M';
        } else {
          newAmount = mustIncreaseAmount ? parsedAmount + 1 : parsedAmount - 1;
        }
        break;

      default:
        throw new TypeError('Unhandled datemath unit');
    }

    return {
      value: `now${operator}${newAmount}${newUnit}`,
      diffUnit: newUnit,
      diffAmount:
        newUnit !== unit
          ? Math.abs(newAmount - convertDate(parsedAmount, unit, newUnit))
          : Math.abs(newAmount - parsedAmount),
    };
  }

  return undefined;
}

const CONVERSION_RATIOS: Record<string, Array<[Unit, number]>> = {
  wy: [
    ['w', 52], // 1 year = 52 weeks
    ['y', 1],
  ],
  w: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 7], // 1 week = 7 days
    ['w', 4], // 1 month = 4 weeks = 28 days
    ['M', 12], // 1 year = 12 months = 52 weeks = 364 days
    ['y', 1],
  ],
  M: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 30], // 1 month = 30 days
    ['M', 12], // 1 year = 12 months = 360 days
    ['y', 1],
  ],
  default: [
    ['ms', 1000],
    ['s', 60],
    ['m', 60],
    ['h', 24],
    ['d', 365], // 1 year = 365 days
    ['y', 1],
  ],
};

export function convertDate(value: number, from: Unit, to: Unit): number {
  if (from === to) {
    return value;
  }

  let ratios;
  if ((from === 'y' && to === 'w') || (from === 'w' && to === 'y')) {
    ratios = CONVERSION_RATIOS.wy;
  } else if (from === 'w' || to === 'w') {
    ratios = CONVERSION_RATIOS.w;
  } else if (from === 'M' || to === 'M') {
    ratios = CONVERSION_RATIOS.M;
  } else {
    ratios = CONVERSION_RATIOS.default;
  }

  let convertedValue = value;

  const fromIdx = ratios.findIndex(ratio => ratio[0] === from);
  const toIdx = ratios.findIndex(ratio => ratio[0] === to);

  if (fromIdx > toIdx) {
    // `from` is the bigger unit. Multiply the value
    for (let i = toIdx; i < fromIdx; i++) {
      convertedValue *= ratios[i][1];
    }
  } else {
    // `from` is the smaller unit. Divide the value
    for (let i = fromIdx; i < toIdx; i++) {
      convertedValue /= ratios[i][1];
    }
  }

  return convertedValue;
}
