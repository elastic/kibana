/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { HeaderColor } from '@kbn/agent-builder-browser/attachments';

interface HeaderColorTokens {
  /** Border color of the card. */
  border: string;
  /** Color of the divider under the header. */
  divider: string;
  /** Color of the header title and icon. Unset for the default (no color) variant. */
  text?: string;
}

/** Resolves the EUI color tokens for an attachment header color variant. */
export const useHeaderColorTokens = (color?: HeaderColor): HeaderColorTokens => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const variants: Record<HeaderColor, HeaderColorTokens> = {
    primary: {
      border: colors.borderStrongPrimary,
      divider: colors.borderBaseSubdued,
      text: colors.textPrimary,
    },
    danger: {
      border: colors.borderStrongDanger,
      divider: colors.borderBaseSubdued,
      text: colors.textDanger,
    },
    warning: {
      border: colors.borderStrongWarning,
      divider: colors.borderBaseSubdued,
      text: colors.textWarning,
    },
  };

  return color
    ? variants[color]
    : { border: colors.borderBasePlain, divider: colors.borderBasePlain };
};
