/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import { AssistantAvatar } from './assistant_avatar/assistant_avatar';

const Container = styled.div`
  display: inline-block;
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: ${euiThemeVars.euiSizeXXL};
  margin-bottom: ${euiThemeVars.euiSizeL};

  :before,
  :after {
    content: '';
    position: absolute;
  }
`;

const Animation = styled.div`
  width: 99%;
  height: 99%;
  border-radius: 50px;
  z-index: 1;
  position: relative;

  &:before,
  &:after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border: inherit;
    top: 0;
    left: 0;
    z-index: 0;
    border: 1px solid ${euiThemeVars.euiColorPrimary};
    border-radius: inherit;
    animation: 4s cubic-bezier(0.42, 0, 0.37, 1) 0.5s infinite normal none running pulsing;
  }
  &:after {
    animation: 4s cubic-bezier(0.42, 0, 0.37, 1) 0.5s infinite normal none running pulsing1;
  }

  @keyframes pulsing {
    0% {
      opacity: 1;
      transform: scaleY(1) scaleX(1);
    }
    20% {
      opacity: 0.5;
    }
    70% {
      opacity: 0.2;
      transform: scaleY(2) scaleX(2);
    }
    80% {
      opacity: 0;
      transform: scaleY(2) scaleX(2);
    }
    90% {
      opacity: 0;
      transform: scaleY(1) scaleX(1);
    }
  }
  @keyframes pulsing1 {
    0% {
      opacity: 1;
      transform: scaleY(1) scaleX(1);
    }
    15% {
      opacity: 1;
      transform: scaleY(1) scaleX(1);
    }
    40% {
      opacity: 0.5;
    }
    70% {
      opacity: 0.2;
      transform: scaleY(1.5) scaleX(1.5);
    }
    80% {
      opacity: 0;
      transform: scaleY(1.5) scaleX(1.5);
    }
    90% {
      opacity: 0;
      transform: scaleY(1) scaleX(1);
    }
  }
`;

const AvatarWrapper = styled.span`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  :before,
  :after {
    content: '';
    position: absolute;
  }
`;

export const AssistantAnimatedIcon = React.memo(() => (
  <Container>
    <Animation />
    <AvatarWrapper>
      <AssistantAvatar size="m" />
    </AvatarWrapper>
  </Container>
));

AssistantAnimatedIcon.displayName = 'AssistantAnimatedIcon';
