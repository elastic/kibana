/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTruncateText } from '@kbn/react-hooks';
import React from 'react';

/**
 * How much agent-authored text to show before collapsing it. Long enough to judge a suggestion at a
 * glance, short enough that one verbose item cannot push the rest of a list off screen.
 */
export const TEXT_PREVIEW_LENGTH = 1000;

interface ExpandableTextProps {
  text: string;
  /** Characters to show while collapsed. */
  maxLength?: number;
}

/**
 * Long free text with a toggle to expand it in place. Renders the text and its toggle as plain
 * inline content so callers keep control of the surrounding typography — a paragraph, a description
 * list entry, a callout body.
 */
export const ExpandableText = ({ text, maxLength = TEXT_PREVIEW_LENGTH }: ExpandableTextProps) => {
  const { displayText, isExpanded, toggleExpanded, shouldTruncate } = useTruncateText(
    text,
    maxLength
  );

  return (
    <>
      {displayText}
      {shouldTruncate && (
        <>
          {' '}
          <EuiLink onClick={toggleExpanded} data-test-subj="contextExpandableTextToggle">
            {isExpanded
              ? i18n.translate('xpack.contextEngine.expandableText.showLess', {
                  defaultMessage: 'Show less',
                })
              : i18n.translate('xpack.contextEngine.expandableText.showMore', {
                  defaultMessage: 'Show more',
                })}
          </EuiLink>
        </>
      )}
    </>
  );
};
