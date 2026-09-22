/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessorInternal, ProcessorSelector } from '../types';
import { DropSpecialLocations } from '../constants';
import { getValue } from '../utils';
import { getProcessorDescriptor } from '../components/shared';
import { pipelineEditorContextI18nTexts } from './i18n_texts';

const getScopeLabel = (selector: ProcessorSelector) => {
  const hasOnFailure = selector.includes('onFailure');
  if (!hasOnFailure) return pipelineEditorContextI18nTexts.destinationScope.processors;
  const firstOnFailure = selector.indexOf('onFailure');
  const isNestedOnFailure = selector.indexOf('onFailure', firstOnFailure + 1) !== -1;
  return firstOnFailure === 0 && !isNestedOnFailure
    ? pipelineEditorContextI18nTexts.destinationScope.failureProcessors
    : pipelineEditorContextI18nTexts.destinationScope.failureHandlers;
};

const getProcessorTypeLabel = (processor: ProcessorInternal): string =>
  getProcessorDescriptor(processor.type)?.label ?? processor.type;

const getDestinationDescription = ({
  destination,
  processors,
  onFailureProcessors,
}: {
  destination: ProcessorSelector;
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
}): { destinationScopeLabel: string; destinationDescription: string } => {
  const destinationLastSegment = destination[destination.length - 1];
  const destinationArraySelector = destination.slice(0, -1);
  const destinationScopeLabel = getScopeLabel(destinationArraySelector);

  if (destinationLastSegment === DropSpecialLocations.top) {
    const destinationArray = getValue<ProcessorInternal[]>(destinationArraySelector, {
      processors,
      onFailure: onFailureProcessors,
    });
    if (destinationArray?.length) {
      const firstProcessorLabel = getProcessorTypeLabel(destinationArray[0]);
      return {
        destinationScopeLabel,
        destinationDescription: pipelineEditorContextI18nTexts.moveBefore({
          targetProcessor: firstProcessorLabel,
        }),
      };
    }

    return {
      destinationScopeLabel,
      destinationDescription: pipelineEditorContextI18nTexts.moveToStartWithScope({
        scopeLabel: destinationScopeLabel,
      }),
    };
  }

  if (destinationLastSegment === DropSpecialLocations.bottom) {
    return {
      destinationScopeLabel,
      destinationDescription: pipelineEditorContextI18nTexts.moveToEnd(),
    };
  }

  if (!/^-?[0-9]+$/.test(destinationLastSegment)) {
    return {
      destinationScopeLabel,
      destinationDescription: pipelineEditorContextI18nTexts.moveToNewPosition(),
    };
  }

  const insertionIndex = parseInt(destinationLastSegment, 10);
  const destinationArray = getValue<ProcessorInternal[]>(destinationArraySelector, {
    processors,
    onFailure: onFailureProcessors,
  });

  if (!destinationArray?.length) {
    return {
      destinationScopeLabel,
      destinationDescription: pipelineEditorContextI18nTexts.moveToStartEmptyWithScope({
        scopeLabel: destinationScopeLabel,
      }),
    };
  }

  if (insertionIndex <= 0) {
    const firstProcessorLabel = getProcessorTypeLabel(destinationArray[0]);
    return {
      destinationScopeLabel,
      destinationDescription: pipelineEditorContextI18nTexts.moveBefore({
        targetProcessor: firstProcessorLabel,
      }),
    };
  }

  const afterProcessor =
    destinationArray[Math.min(insertionIndex - 1, destinationArray.length - 1)];
  const afterProcessorLabel = getProcessorTypeLabel(afterProcessor);
  return {
    destinationScopeLabel,
    destinationDescription: pipelineEditorContextI18nTexts.moveAfter({
      targetProcessor: afterProcessorLabel,
    }),
  };
};

export const buildMoveAnnouncement = ({
  source,
  destination,
  processors,
  onFailureProcessors,
}: {
  source: ProcessorSelector;
  destination: ProcessorSelector;
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
}): { movedProcessorId: string; announcement: string } | undefined => {
  let movedProcessor: ProcessorInternal | undefined;
  try {
    movedProcessor = getValue<ProcessorInternal | undefined>(source, {
      processors,
      onFailure: onFailureProcessors,
    });
  } catch {
    return;
  }

  if (!movedProcessor?.id) return;

  const sourceScopeLabel = getScopeLabel(source);
  const { destinationScopeLabel, destinationDescription } = getDestinationDescription({
    destination,
    processors,
    onFailureProcessors,
  });

  const movedProcessorLabel = getProcessorTypeLabel(movedProcessor);
  const scopeChanged = sourceScopeLabel !== destinationScopeLabel;

  const announcement = scopeChanged
    ? pipelineEditorContextI18nTexts.moveSuccessWithScopeChange({
        processorType: movedProcessorLabel,
        sourceScope: sourceScopeLabel,
        destinationScope: destinationScopeLabel,
        destinationDescription,
      })
    : pipelineEditorContextI18nTexts.moveSuccess({
        processorType: movedProcessorLabel,
        destinationDescription,
      });

  return {
    movedProcessorId: movedProcessor.id,
    announcement,
  };
};

export const restoreMovedProcessorFocus = ({
  movedProcessorId,
  maxFrames = 60,
  onDone,
}: {
  movedProcessorId: string;
  maxFrames?: number;
  onDone: (result: { didFocus: boolean }) => void;
}) => {
  let cancelled = false;
  let frames = 0;

  const focusMovedProcessor = (): boolean => {
    const processorContainer = document.querySelector(`[data-processor-id="${movedProcessorId}"]`);
    const moveButton = processorContainer?.querySelector('button[data-test-subj="moveItemButton"]');
    if (!(moveButton instanceof HTMLButtonElement)) return false;

    if (document.activeElement !== moveButton) {
      try {
        moveButton.focus({ preventScroll: true });
      } catch {
        moveButton.focus();
      }
    }

    return document.activeElement === moveButton;
  };

  const attempt = () => {
    if (cancelled) return;
    frames += 1;
    if (focusMovedProcessor()) {
      onDone({ didFocus: true });
      return;
    }
    if (frames >= maxFrames) {
      onDone({ didFocus: false });
      return;
    }
    window.requestAnimationFrame(attempt);
  };

  window.requestAnimationFrame(attempt);

  return () => {
    cancelled = true;
  };
};

interface RefLike<T> {
  current: T;
}

export const applyPendingMoveA11yEffects = ({
  modeId,
  pendingFocusProcessorIdRef,
  pendingMoveAnnouncementRef,
  setMoveAnnouncement,
}: {
  modeId: string;
  pendingFocusProcessorIdRef: RefLike<string | null>;
  pendingMoveAnnouncementRef: RefLike<string | null>;
  setMoveAnnouncement: (next: string) => void;
}): void | (() => void) => {
  if (modeId !== 'idle') return;

  const processorIdToFocus = pendingFocusProcessorIdRef.current;
  const nextAnnouncement = pendingMoveAnnouncementRef.current;
  if (!processorIdToFocus && !nextAnnouncement) return;

  const focusFallback = () => {
    const fallback = document.querySelector('button[data-test-subj="addProcessorButton"]');
    if (fallback instanceof HTMLButtonElement) {
      try {
        fallback.focus({ preventScroll: true });
      } catch {
        fallback.focus();
      }
    }
  };

  if (!processorIdToFocus) {
    pendingMoveAnnouncementRef.current = null;
    if (nextAnnouncement) setMoveAnnouncement(nextAnnouncement);
    return;
  }

  return restoreMovedProcessorFocus({
    movedProcessorId: processorIdToFocus,
    onDone: ({ didFocus }) => {
      pendingFocusProcessorIdRef.current = null;

      if (!didFocus) {
        focusFallback();
      }

      // Announce after focus is settled to avoid VO/NVDA announcing the document/body title
      // during the focus gap and preempting the confirmation.
      if (nextAnnouncement) {
        pendingMoveAnnouncementRef.current = null;
        setMoveAnnouncement(nextAnnouncement);
      } else {
        pendingMoveAnnouncementRef.current = null;
      }
    },
  });
};
