/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React, { useState } from 'react';
import { useAssetBasePath } from '../../../../../hooks/use_asset_base_path';

const connectorIcons: Array<{ match: string[]; icon?: IconType; src?: string }> = [
  { match: ['gpt', 'openai'], src: 'openai.svg' },
  { match: ['claude', 'anthropic'], src: 'anthropic.svg' },
  { match: ['gemini'], src: 'gemini.svg' },
  { match: ['elastic'], icon: 'logoElastic' },
];

export const ConnectorIcon: React.FC<{ connectorName: string }> = ({ connectorName }) => {
  const assetBasePath = useAssetBasePath();
  const normalizedName = connectorName.toLowerCase();
  const [shouldUseFallback, setShouldUseFallback] = useState(false);

  const matchedIcon = connectorIcons.find((config) =>
    config.match.some((matchString) => normalizedName.includes(matchString))
  );

  if (matchedIcon?.icon) {
    return <EuiIcon type={matchedIcon.icon} />;
  }

  if (matchedIcon?.src && !shouldUseFallback) {
    return (
      <EuiIcon
        type={`${assetBasePath}/${matchedIcon.src}`}
        onError={() => {
          setShouldUseFallback(true);
        }}
      />
    );
  }

  // Fallback to compute icon
  return <EuiIcon type="compute" />;
};
