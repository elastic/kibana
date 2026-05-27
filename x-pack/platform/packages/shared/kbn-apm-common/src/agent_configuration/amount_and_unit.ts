/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface AmountAndUnit {
  amount: number;
  unit: string;
}

export function amountAndUnitToObject(value: string): AmountAndUnit {
  // matches any postive and negative number and its unit.
  const [, amount = '', unit = ''] = value.match(/(^-?\d+)?(\w+)?/) || [];
  return { amount: parseInt(amount, 10), unit };
}

export function amountAndUnitToString({
  amount,
  unit,
}: Omit<AmountAndUnit, 'amount'> & { amount: string | number }) {
  return `${amount}${unit}`;
}
