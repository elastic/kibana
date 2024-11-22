/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextTruncate, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

const NODE_WIDTH = 90;
const NODE_LABEL_WIDTH = 160;

const GeneratedText = React.memo<React.PropsWithChildren<{}>>(function ({ children }) {
  return <>{processedValue()}</>;

  function processedValue() {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const valueSplitByWordBoundaries = child.split(/\b/);

        if (valueSplitByWordBoundaries.length < 2) {
          return valueSplitByWordBoundaries[0];
        }

        return [
          valueSplitByWordBoundaries[0],
          ...valueSplitByWordBoundaries
            .splice(1)
            .reduce(function (generatedTextMemo: Array<string | JSX.Element>, value) {
              return [...generatedTextMemo, value, <wbr />];
            }, []),
        ];
      } else {
        return child;
      }
    });
  }
});

export interface NodeLabelProps {
  text?: string;
}

const NodeLabelComponent: React.FC<NodeLabelProps> = ({ text = '' }: NodeLabelProps) => {
  const [isTruncated, setIsTruncated] = React.useState(false);

  return (
    <EuiText
      size="xs"
      textAlign="center"
      css={css`
        width: ${NODE_LABEL_WIDTH}px;
        margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
        max-height: 32px;
      `}
    >
      <EuiToolTip content={isTruncated ? text : ''} position="bottom">
        <EuiTextTruncate
          truncation="end"
          truncationOffset={26}
          text={text}
          width={NODE_LABEL_WIDTH * 2 - 5}
        >
          {(truncatedText) => (
            <>
              {setIsTruncated(truncatedText.length !== text.length)}
              {<GeneratedText>{truncatedText}</GeneratedText>}
            </>
          )}
        </EuiTextTruncate>
      </EuiToolTip>
    </EuiText>
  );
};

export const NodeLabel = styled(NodeLabelComponent)`
  width: ${NODE_LABEL_WIDTH}px;
  margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
  text-overflow: ellipsis;
  // white-space: nowrap;
  overflow: hidden;
`;
