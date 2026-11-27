/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTokenProps } from '@elastic/eui';
import { EuiToken } from '@elastic/eui';
import React from 'react';
import { FieldIcon } from '@kbn/react-field';

/** Structural types a data reference can have, which the shared field icon has no token for. */
const STRUCTURAL_TOKENS = {
  array: 'tokenArray',
  object: 'tokenObject',
} as const;

const isStructuralType = (type: string): type is keyof typeof STRUCTURAL_TOKENS =>
  Object.hasOwn(STRUCTURAL_TOKENS, type);

interface ReferenceTypeIconProps {
  /** A `FieldIcon` type, as returned by `toReferenceIconType`. */
  readonly type: string;
  readonly color?: EuiTokenProps['color'];
}

/** The square type token shown beside a data reference. */
export const ReferenceTypeIcon = ({ type, color }: ReferenceTypeIconProps) =>
  isStructuralType(type) ? (
    <EuiToken
      iconType={STRUCTURAL_TOKENS[type]}
      aria-label={type}
      title={type}
      size="s"
      shape="square"
      color={color}
    />
  ) : (
    <FieldIcon type={type} size="s" shape="square" color={color} />
  );
