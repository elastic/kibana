/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { usePushFlyoutFocus } from './use_push_flyout_focus';

const TestFlyout = ({ enabled }: { enabled?: boolean }) => {
  const { focusProps } = usePushFlyoutFocus({ enabled });
  return (
    <div role="region" aria-label="Test flyout" data-test-subj="flyout" {...focusProps}>
      flyout content
    </div>
  );
};

const Flyout = ({ onClose }: { onClose: () => void }) => {
  const { focusProps } = usePushFlyoutFocus();
  return (
    <div role="region" aria-label="Test flyout" data-test-subj="flyout" {...focusProps}>
      <button type="button" data-test-subj="close" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

/**
 * Mirrors how the lifecycle tab works: a trigger opens the flyout and gets disabled while it is
 * open (flyout coordination), then re-enabled on close.
 */
const TriggerAndFlyout = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-test-subj="trigger"
        disabled={isOpen}
        onClick={() => setIsOpen(true)}
      >
        Open
      </button>
      {isOpen && <Flyout onClose={() => setIsOpen(false)} />}
    </>
  );
};

/**
 * Mirrors the trickier lifecycle triggers (e.g. "Add data phase"): the trigger stays focused and
 * enabled when the flyout opens, but a *later* commit (flyout coordination toggling on) disables it,
 * which makes `EuiButton` wrap itself in a tooltip and mount a brand-new DOM node. The originally
 * focused node is detached by close time, so focus must return via a stable selector.
 */
const TriggerThatRemountsLater = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [remounted, setRemounted] = useState(false);

  // The disable/remount happens a commit after the flyout opens, not synchronously with the click.
  useEffect(() => {
    setRemounted(isOpen);
  }, [isOpen]);

  const trigger = (
    <button
      type="button"
      data-test-subj="trigger"
      disabled={remounted}
      onClick={() => setIsOpen(true)}
    >
      Open
    </button>
  );

  return (
    <>
      {remounted ? <span data-test-subj="wrapper">{trigger}</span> : trigger}
      {isOpen && <Flyout onClose={() => setIsOpen(false)} />}
    </>
  );
};

/**
 * Mirrors the real "Add data phase" flow: the trigger is a popover anchor. Clicking it moves focus
 * into a context-menu panel; selecting an item closes the popover and opens the flyout, which
 * disables and remounts the anchor. At flyout-open time the anchor is neither focused nor focusable,
 * so focus must return to it from the trigger tracked *before* the popover stole focus — not to the
 * transient menu item.
 */
const PopoverTriggerAndFlyout = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const anchorDisabled = isFlyoutOpen;

  const anchor = (
    <button
      type="button"
      data-test-subj="anchor"
      disabled={anchorDisabled}
      onClick={() => setIsPopoverOpen(true)}
    >
      Add data phase
    </button>
  );

  return (
    <>
      {/* Disabling remounts the anchor into a wrapper, detaching the original node. */}
      {anchorDisabled ? <span data-test-subj="anchorWrapper">{anchor}</span> : anchor}
      {isPopoverOpen && (
        <div className="euiContextMenuPanel" data-test-subj="menu">
          <button
            type="button"
            data-test-subj="menuItem"
            onClick={() => {
              setIsPopoverOpen(false);
              setIsFlyoutOpen(true);
            }}
          >
            Frozen
          </button>
        </div>
      )}
      {isFlyoutOpen && <Flyout onClose={() => setIsFlyoutOpen(false)} />}
    </>
  );
};

describe('usePushFlyoutFocus', () => {
  it('moves focus into the flyout when it opens', async () => {
    render(<TestFlyout />);

    await waitFor(() => expect(screen.getByTestId('flyout')).toHaveFocus());
  });

  it('makes the flyout container programmatically focusable', async () => {
    render(<TestFlyout />);

    await waitFor(() => expect(screen.getByTestId('flyout')).toHaveAttribute('tabindex', '-1'));
  });

  it('returns focus to the trigger on close, even if it was disabled while the flyout was open', async () => {
    render(<TriggerAndFlyout />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);

    // The flyout receives focus and the trigger is disabled while it is open.
    await waitFor(() => expect(screen.getByTestId('flyout')).toHaveFocus());
    expect(trigger).toBeDisabled();

    fireEvent.click(screen.getByTestId('close'));

    // Focus returns to the (now re-enabled) trigger.
    await waitFor(() => expect(screen.getByTestId('trigger')).toHaveFocus());
  });

  it('returns focus to the re-mounted trigger when its node is swapped while the flyout is open', async () => {
    render(<TriggerThatRemountsLater />);

    const originalTrigger = screen.getByTestId('trigger');
    originalTrigger.focus();
    expect(originalTrigger).toHaveFocus();

    fireEvent.click(originalTrigger);

    await waitFor(() => expect(screen.getByTestId('flyout')).toHaveFocus());
    // The trigger has been remounted into a fresh node, detaching the originally focused one.
    await waitFor(() => expect(screen.getByTestId('trigger')).not.toBe(originalTrigger));
    expect(originalTrigger.isConnected).toBe(false);

    fireEvent.click(screen.getByTestId('close'));

    // Focus lands on the re-mounted trigger, located via its stable selector.
    await waitFor(() => expect(screen.getByTestId('trigger')).toHaveFocus());
  });

  it('returns focus to the popover anchor, not the transient menu item that opened the flyout', async () => {
    render(<PopoverTriggerAndFlyout />);

    // The user focuses and clicks the anchor to open the popover.
    const anchor = screen.getByTestId('anchor');
    anchor.focus();
    fireEvent.click(anchor);

    // The popover moves focus into its (transient) context-menu panel.
    const menuItem = screen.getByTestId('menuItem');
    menuItem.focus();
    expect(menuItem).toHaveFocus();

    // Selecting the item opens the flyout and disables + remounts the anchor.
    fireEvent.click(menuItem);

    await waitFor(() => expect(screen.getByTestId('flyout')).toHaveFocus());
    expect(screen.getByTestId('anchor')).toBeDisabled();

    fireEvent.click(screen.getByTestId('close'));

    // Focus returns to the re-enabled anchor, not the (gone) menu item.
    await waitFor(() => expect(screen.getByTestId('anchor')).toHaveFocus());
  });

  it('does not manage focus when disabled', async () => {
    render(
      <button type="button" data-test-subj="trigger">
        Open
      </button>
    );
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    render(<TestFlyout enabled={false} />, {
      container: document.body.appendChild(document.createElement('div')),
    });

    await new Promise((resolve) => setTimeout(resolve));
    expect(trigger).toHaveFocus();
  });
});
