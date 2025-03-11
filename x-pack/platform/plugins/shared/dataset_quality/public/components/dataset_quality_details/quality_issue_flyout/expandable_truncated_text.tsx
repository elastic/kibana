/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCode, EuiFlexGroup } from '@elastic/eui';
import { readLess, readMore } from '../../../../common/translations';

interface TruncatedTextWithToggleProps {
  text: string;
  maxCharLength?: number;
  truncatedTextLength?: number;
  codeLanguage?: string;
}

export const ExpandableTruncatedText = ({
  text,
  maxCharLength = 150,
  truncatedTextLength = 33,
  codeLanguage,
}: TruncatedTextWithToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = text.length > maxCharLength;
  const displayText =
    shouldTruncate && !isExpanded ? `${text.slice(0, truncatedTextLength)}...` : text;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiCode language={codeLanguage} style={{ fontWeight: 'normal' }}>
        {displayText}
      </EuiCode>
      {shouldTruncate && (
        <EuiCode>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            color="primary"
            css={{ fontWeight: 'bold', textDecoration: 'underline' }}
          >
            {isExpanded ? readLess : readMore}
          </button>
        </EuiCode>
      )}
    </EuiFlexGroup>
  );
};
