/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useRef, useLayoutEffect, Fragment, useCallback } from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiButton, EuiHorizontalRule } from '@elastic/eui';
import euiStyled from '../../../../common/eui_styled_components';

const BottomFade = euiStyled.div`
width: 100%;
background: ${props =>
  `linear-gradient(${props.theme.eui.euiColorEmptyShade}00 0%, ${props.theme.eui.euiColorEmptyShade} 100%)`};
margin-top: -${props => parseInt(props.theme.eui.spacerSizes.xl, 10) * 2}px;
height: ${props => parseInt(props.theme.eui.spacerSizes.xl, 10) * 2}px;
position: absolute;
`;
const ContentCollapseContainer = euiStyled.div`
position: relative;
`;
const CollapseButtonContainer = euiStyled.div`
display: inline-block;
background-color: ${props => props.theme.eui.euiColorGhost};
position: absolute;
left: 50%;
transform: translateX(-50%);
top: ${props => parseInt(props.theme.eui.euiButtonHeight, 10) / 2}px;
`;
const CollapseButtonTop = euiStyled(EuiButtonEmpty)`
float: right;
`;

const CollapseButton = ({
  open,
  toggleCollapse,
}: {
  open: boolean;
  toggleCollapse: () => void;
}) => {
  return (
    <div style={{ position: 'relative' }}>
      <EuiSpacer size="m" />
      <EuiHorizontalRule />
      <CollapseButtonContainer>
        <EuiButton onClick={toggleCollapse} iconType={`arrow${open ? 'Up' : 'Down'}`}>
          {open ? 'Collapse' : 'Read more'}
        </EuiButton>
      </CollapseButtonContainer>
    </div>
  );
};

export const ContentCollapse = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [height, setHeight] = useState<number | string>('auto');
  const [collapsible, setCollapsible] = useState<boolean>(true);
  const contentEl = useRef<HTMLDivElement>(null);
  const collapsedHeight = 360;

  // if content is too small, don't collapse
  useLayoutEffect(
    () =>
      contentEl.current && contentEl.current.clientHeight < collapsedHeight
        ? setCollapsible(false)
        : setHeight(collapsedHeight),
    []
  );

  const clickOpen = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <Fragment>
      {collapsible ? (
        <ContentCollapseContainer>
          <div
            ref={contentEl}
            style={{ height: `${open ? 'auto' : `${height}px`}`, overflow: 'hidden' }}
          >
            {open && (
              <CollapseButtonTop onClick={clickOpen} iconType={`arrow${open ? 'Up' : 'Down'}`}>
                Collapse
              </CollapseButtonTop>
            )}
            {children}
          </div>
          {!open && <BottomFade />}
          <CollapseButton open={open} toggleCollapse={clickOpen} />
        </ContentCollapseContainer>
      ) : (
        <div>{children}</div>
      )}
    </Fragment>
  );
};
