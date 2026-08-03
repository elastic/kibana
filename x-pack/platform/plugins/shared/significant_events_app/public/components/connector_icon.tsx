/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { GeminiLogo, OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import anthropicIcon from '@kbn/inference-endpoint-ui-common/src/components/providers/assets/images/anthropic.svg';

const connectorIcons: Array<{ match: string[]; icon: IconType }> = [
  { match: ['gpt', 'openai'], icon: OpenAILogo },
  { match: ['claude', 'anthropic'], icon: anthropicIcon },
  { match: ['gemini'], icon: GeminiLogo },
  { match: ['elastic'], icon: 'logoElastic' },
];

const fallbackIconType = 'compute';

export const ConnectorIcon: React.FC<{ connectorName?: string }> = ({ connectorName }) => {
  let iconType: IconType = fallbackIconType;
  if (connectorName) {
    const normalizedName = connectorName.toLowerCase();
    const matchedIcon = connectorIcons.find((config) =>
      config.match.some((matchString) => normalizedName.includes(matchString))
    );
    if (matchedIcon) {
      iconType = matchedIcon.icon;
    }
  }
  return <EuiIcon type={iconType} aria-hidden={true} />;
};
