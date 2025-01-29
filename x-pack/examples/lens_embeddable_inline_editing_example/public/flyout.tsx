/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiPanel } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

interface MainContent {
  content: JSX.Element;
}

interface InlineEditingContent {
  visible?: boolean;
}

interface Props {
  mainContent: MainContent;
  inlineEditingContent: InlineEditingContent;
  setContainer?: (element: HTMLDivElement | null) => void;
  onClose: () => void;
}

export function MultiPaneFlyout({
  mainContent,
  inlineEditingContent,
  onClose,
  setContainer,
}: Props) {
  const [flexBasisCol1, setFlexBasisCol1] = useState('100%');
  const [flexBasisCol2, setFlexBasisCol2] = useState(!inlineEditingContent?.visible ? '0%' : '30%');

  useEffect(() => {
    setFlexBasisCol1(inlineEditingContent?.visible ? '70%' : '100%');
    setFlexBasisCol2(inlineEditingContent?.visible ? '30%' : '0%');
  }, [inlineEditingContent]);

  return (
    <EuiFlyout
      onClose={onClose}
      size={inlineEditingContent && inlineEditingContent?.visible ? 'l' : 'm'}
      ownFocus={false}
      outsideClickCloses
    >
      <EuiFlexGroup direction="row" gutterSize={'none'} style={{ height: '100%' }}>
        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol1,
            ...(inlineEditingContent && inlineEditingContent.visible
              ? { borderRight: `solid 1px ${euiThemeVars.euiBorderColor}` }
              : {}),
          }}
        >
          <MainContent content={mainContent.content} />
        </EuiFlexItem>

        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol2,
            height: '100%',
          }}
        >
          {inlineEditingContent ? (
            <InlineEditingContent
              setContainer={setContainer}
              visible={inlineEditingContent.visible}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  );
}

function InlineEditingContent({
  visible,
  setContainer,
}: {
  visible?: boolean;
  setContainer?: (element: HTMLDivElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const style = css`
    padding: 0;
    position: relative;
    height: 100%;
   }
`;

  useEffect(() => {
    if (containerRef?.current && setContainer) {
      setContainer(containerRef.current);
    }
  }, [setContainer]);
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m" css={style}>
      <EuiFlexGroup
        className="lnsConfigPanel__overlay"
        css={css`
           block-size: ${visible ? '100%' : 0};
          }
        `}
        direction="column"
        ref={containerRef}
        gutterSize="none"
      />
    </EuiPanel>
  );
}

function MainContent({ content }: { content: JSX.Element }) {
  const style = css`
    padding-top: 12px;
    padding-botton: 12px;
   }
  `;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m" css={style}>
      {content}
    </EuiPanel>
  );
}
