/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INLINE_ATTACHMENT_TEST_SUBJ_PREFIX = 'agentBuilderInlineAttachment-';
const ATTACHMENT_PILL_TEST_SUBJ_PREFIX = 'agentBuilderAttachmentPill-';
const HIGHLIGHT_ATTRIBUTE = 'data-agent-builder-attachment-highlight';
const HIGHLIGHT_DURATION_MS = 1500;

const waitForNextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

const findAttachmentElement = (attachmentId: string): HTMLElement | null => {
  return (
    document.querySelector<HTMLElement>(
      `[data-test-subj="${INLINE_ATTACHMENT_TEST_SUBJ_PREFIX}${attachmentId}"]`
    ) ??
    document.querySelector<HTMLElement>(
      `[data-test-subj="${ATTACHMENT_PILL_TEST_SUBJ_PREFIX}${attachmentId}"]`
    )
  );
};

const highlightAttachmentElement = (element: HTMLElement): void => {
  element.setAttribute(HIGHLIGHT_ATTRIBUTE, 'true');

  window.setTimeout(() => {
    element.removeAttribute(HIGHLIGHT_ATTRIBUTE);
  }, HIGHLIGHT_DURATION_MS);
};

export const scrollToInlineAttachment = async (
  attachmentId: string,
  scrollContainer?: HTMLDivElement | null
): Promise<void> => {
  let target = findAttachmentElement(attachmentId);

  if (!target) {
    await waitForNextPaint();
    target = findAttachmentElement(attachmentId);
  }

  if (!target) {
    return;
  }

  if (scrollContainer && !scrollContainer.contains(target)) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  highlightAttachmentElement(target);
};
