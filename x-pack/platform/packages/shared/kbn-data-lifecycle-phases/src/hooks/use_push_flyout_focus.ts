/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface UsePushFlyoutFocusOptions {
  /** When `false`, focus is left untouched (e.g. overlay flyouts, where EUI handles it). Defaults to `true`. */
  enabled?: boolean;
}

export interface UsePushFlyoutFocusResult {
  /** Spread onto the push `EuiFlyout` that should receive focus when it opens. */
  focusProps: {
    ref: (element: HTMLElement | null) => void;
  };
}

// Overlays whose focus we ignore: it identifies the overlay, not the control that opened the flyout.
const TRANSIENT_OVERLAY_SELECTOR =
  '.euiFlyout, .euiPopover__panel, .euiContextMenuPanel, .euiToolTipPopover, [role="dialog"]';

// Lets us re-find the trigger if its DOM node is swapped between open and close (e.g. a button that
// gets disabled while the flyout is open remounts inside an `EuiToolTip`).
const getStableSelector = (element: HTMLElement): string | null => {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  const testSubject = element.getAttribute('data-test-subj');
  return testSubject ? `[data-test-subj="${testSubject.replace(/(["\\])/g, '\\$1')}"]` : null;
};

interface TrackedTrigger {
  element: HTMLElement;
  selector: string | null;
}

// The last non-overlay control the user focused or clicked — the trigger a push flyout should
// return focus to on close. Tracked globally because by flyout-open time the trigger is often no
// longer `document.activeElement` (a closing popover or a disabled/remounted trigger strands focus).
let lastTrigger: TrackedTrigger | null = null;

const isFocusable = (element: HTMLElement): boolean =>
  element.isConnected &&
  !element.hasAttribute('disabled') &&
  element.getAttribute('aria-disabled') !== 'true';

const recordTrigger = (target: EventTarget | null): void => {
  if (
    !(target instanceof HTMLElement) ||
    target === document.body ||
    target.closest(TRANSIENT_OVERLAY_SELECTOR)
  ) {
    return;
  }
  lastTrigger = { element: target, selector: getStableSelector(target) };
};

if (typeof document !== 'undefined') {
  // `focusin` covers keyboard/programmatic focus; `pointerdown` covers mouse clicks that don't
  // focus first. Capture phase so overlays that stop propagation can't hide the interaction.
  document.addEventListener('focusin', (event) => recordTrigger(event.target), true);
  document.addEventListener(
    'pointerdown',
    (event) =>
      recordTrigger(
        event.target instanceof HTMLElement
          ? event.target.closest('button, [role="button"], a, input, select, textarea, [tabindex]')
          : null
      ),
    true
  );
}

/**
 * Manages keyboard focus for push flyouts (`type="push"`), which EUI leaves untrapped (its
 * `EuiFocusTrap` is `disabled` while pushed). Moves focus into the flyout on open and returns it to
 * the trigger on close, without trapping focus so the rest of the page stays interactive. The
 * flyout should carry an accessible name (e.g. `role="region"`/`"dialog"` with `aria-labelledby`)
 * so it is announced when focused.
 */
export const usePushFlyoutFocus = ({
  enabled = true,
}: UsePushFlyoutFocusOptions = {}): UsePushFlyoutFocusResult => {
  const [flyoutElement, setFlyoutElement] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<TrackedTrigger | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    triggerRef.current = lastTrigger;

    return () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      // Defer so a trigger disabled while the flyout was open is re-enabled before we focus it.
      window.setTimeout(() => {
        const target = isFocusable(trigger.element)
          ? trigger.element
          : trigger.selector
          ? document.querySelector<HTMLElement>(trigger.selector)
          : null;
        target?.focus();
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !flyoutElement || !flyoutElement.isConnected) {
      return;
    }

    // EUI doesn't give a pushed flyout a `tabindex`, so make it focusable before focusing it.
    if (!flyoutElement.hasAttribute('tabindex')) {
      flyoutElement.setAttribute('tabindex', '-1');
    }

    // Defer a tick so EUI's focus lock doesn't pull focus back to the trigger.
    const focusTimeoutId = window.setTimeout(() => {
      if (flyoutElement.isConnected) {
        flyoutElement.focus();
      }
    });

    return () => window.clearTimeout(focusTimeoutId);
  }, [enabled, flyoutElement]);

  return {
    focusProps: {
      ref: setFlyoutElement,
    },
  };
};
