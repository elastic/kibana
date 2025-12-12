/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a function that restores focus to a trigger element after a delay.
 * Useful for modals that need time to close before focusing.
 * @param triggerElement - The element to focus when the function is called
 * @param delay - Delay in milliseconds before attempting to focus (default: 0)
 * @returns A function that restores focus to the trigger element
 */
export const createFocusRestoration = (
  triggerElement: HTMLElement | null | undefined,
  delay = 0
): (() => void) => {
  return () => {
    setTimeout(() => {
      if (triggerElement) {
        triggerElement.focus?.();
      }
    }, delay);
  };
};

export const createJobActionFocusRestoration = (jobId: string) => {
  const actionButton = document.getElementById(`${jobId}-actions`)?.querySelector('button');
  return createFocusRestoration(actionButton);
};
