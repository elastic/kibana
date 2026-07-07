/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLink } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

interface Props {
  defaultConversations: string[];
}

export const DefaultConversationsColumn: React.FC<Props> = React.memo(
  ({ defaultConversations }) => {
    const maxConversationsToShow = 5;
    const isOverflow = defaultConversations.length > maxConversationsToShow;

    const [isExpanded, setIsExpanded] = useState(false);

    const currentDisplaying = isExpanded
      ? defaultConversations.length
      : Math.min(maxConversationsToShow, defaultConversations.length);
    const itemsToDisplay = defaultConversations.slice(0, currentDisplaying - 1);

    const toggleContent = useCallback(() => {
      setIsExpanded(!isExpanded);
    }, [isExpanded]);

    if (!defaultConversations || defaultConversations?.length === 0) {
      return null;
    }

    return (
      <>
        {itemsToDisplay.map((c, idx) => (
          <EuiBadge id={`${idx}`} color="hollow">
            {c}
          </EuiBadge>
        ))}
        {isOverflow && (
          <EuiLink onClick={toggleContent}>{isExpanded ? 'Show less' : 'Show All'}</EuiLink>
        )}
      </>
    );
  }
);

DefaultConversationsColumn.displayName = 'DefaultConversationsColumn';
