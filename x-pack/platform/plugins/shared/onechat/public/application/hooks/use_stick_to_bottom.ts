/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

const isAtBottom = (parent: HTMLElement) =>
  parent.scrollTop + parent.clientHeight >= parent.scrollHeight;

export const useStickToBottom = ({
  defaultState,
  scrollContainer,
}: {
  defaultState?: boolean;
  scrollContainer: HTMLDivElement | null;
}) => {
  const [stickToBottom, setStickToBottom] = useState(defaultState ?? true);

  useEffect(() => {
    const parent = scrollContainer?.parentElement;
    if (!parent) {
      return;
    }

    const onScroll = () => {
      setStickToBottom(isAtBottom(parent!));
    };

    parent.addEventListener('scroll', onScroll);

    return () => {
      parent.removeEventListener('scroll', onScroll);
    };
  }, [scrollContainer]);

  useEffect(() => {
    const parent = scrollContainer?.parentElement;
    if (!parent) {
      return;
    }

    if (stickToBottom) {
      parent.scrollTop = parent.scrollHeight;
    }
  });

  return {
    stickToBottom,
    setStickToBottom,
  };
};
