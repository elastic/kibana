/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import {
  CanvasConfigPanelShell,
  clampConfigPanelWidth,
  getMaxConfigPanelWidth,
  MIN_CONFIG_PANEL_WIDTH,
} from './canvas_config_panel_shell';
import { TestProvider } from '../../../shared/mocks/test_providers';

const CANVAS_WIDTH = 1600;

interface HarnessProps {
  readonly onWidthChange: (width: number) => void;
  readonly initialWidth?: number;
  readonly focusKey?: string | number;
  readonly content?: React.ReactNode;
}

/** Mirrors the stateful editor: the committed width lives in the parent. */
const Harness = ({
  onWidthChange,
  initialWidth = 400,
  focusKey,
  content = <button type="button">{'first'}</button>,
}: HarnessProps) => {
  const [width, setWidth] = React.useState(initialWidth);
  return (
    <CanvasConfigPanelShell
      width={width}
      canvasWidth={CANVAS_WIDTH}
      focusKey={focusKey}
      onWidthChange={(next) => {
        onWidthChange(next);
        setWidth(next);
      }}
    >
      {content}
    </CanvasConfigPanelShell>
  );
};

const getHandle = (): HTMLElement => screen.getByTestId('workflowStepConfigPanelResizeHandle');
const getContainer = (): HTMLElement => screen.getByTestId('workflowStepConfigPanelContainer');

describe('width helpers', () => {
  it('keeps the minimum canvas visible beside the panel', () => {
    expect(getMaxConfigPanelWidth(1600)).toBeGreaterThan(MIN_CONFIG_PANEL_WIDTH);
    expect(getMaxConfigPanelWidth(100)).toBe(MIN_CONFIG_PANEL_WIDTH);
  });

  it('clamps into [min, max]', () => {
    const max = getMaxConfigPanelWidth(CANVAS_WIDTH);
    expect(clampConfigPanelWidth(10, CANVAS_WIDTH)).toBe(MIN_CONFIG_PANEL_WIDTH);
    expect(clampConfigPanelWidth(100000, CANVAS_WIDTH)).toBe(max);
    expect(clampConfigPanelWidth(500, CANVAS_WIDTH)).toBe(500);
  });
});

describe('CanvasConfigPanelShell focus', () => {
  it('moves focus into the panel content when it opens', () => {
    render(<Harness onWidthChange={jest.fn()} />, { wrapper: TestProvider });

    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('falls back to the labelled container when nothing inside is tabbable', () => {
    render(<Harness onWidthChange={jest.fn()} content={<p>{'read only'}</p>} />, {
      wrapper: TestProvider,
    });

    expect(getContainer()).toHaveFocus();
    expect(getContainer()).toHaveAttribute('role', 'region');
    expect(getContainer()).toHaveAccessibleName('Configuration panel');
  });

  it('does not steal focus back on re-render, only when the focus key changes', () => {
    const { rerender } = render(
      <Harness
        onWidthChange={jest.fn()}
        focusKey={1}
        content={
          <>
            <button type="button">{'first'}</button>
            <button type="button">{'second'}</button>
          </>
        }
      />,
      { wrapper: TestProvider }
    );
    const content = (
      <>
        <button type="button">{'first'}</button>
        <button type="button">{'second'}</button>
      </>
    );
    screen.getByRole('button', { name: 'second' }).focus();

    rerender(<Harness onWidthChange={jest.fn()} focusKey={1} content={content} />);
    expect(screen.getByRole('button', { name: 'second' })).toHaveFocus();

    // A different step opened in the same shell: focus moves in again.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    rerender(<Harness onWidthChange={jest.fn()} focusKey={2} content={content} />);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    outside.remove();
  });
});

describe('CanvasConfigPanelShell resize separator', () => {
  beforeAll(() => {
    // jsdom has no PointerEvent (so no `clientX` on pointer events) and no pointer capture.
    class TestPointerEvent extends MouseEvent {
      readonly pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    Object.defineProperty(window, 'PointerEvent', { value: TestPointerEvent, configurable: true });
    HTMLElement.prototype.setPointerCapture = jest.fn();
    HTMLElement.prototype.releasePointerCapture = jest.fn();
  });

  it('is reachable by keyboard and exposes its value range', () => {
    render(<Harness onWidthChange={jest.fn()} />, { wrapper: TestProvider });

    const handle = getHandle();
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuenow', '400');
    expect(handle).toHaveAttribute('aria-valuemin', String(MIN_CONFIG_PANEL_WIDTH));
    expect(handle).toHaveAttribute('aria-valuemax', String(getMaxConfigPanelWidth(CANVAS_WIDTH)));
  });

  it('widens with ArrowLeft and narrows with ArrowRight, committing each press', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} />, { wrapper: TestProvider });
    const handle = getHandle();
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenLastCalledWith(416);
    expect(handle).toHaveAttribute('aria-valuenow', '416');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onWidthChange).toHaveBeenLastCalledWith(400);
    expect(handle).toHaveAttribute('aria-valuenow', '400');
  });

  it('uses the large step with Shift', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} />, { wrapper: TestProvider });

    fireEvent.keyDown(getHandle(), { key: 'ArrowLeft', shiftKey: true });

    expect(onWidthChange).toHaveBeenCalledWith(464);
  });

  it('jumps to the minimum with Home and the maximum with End', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} />, { wrapper: TestProvider });

    fireEvent.keyDown(getHandle(), { key: 'End' });
    expect(onWidthChange).toHaveBeenLastCalledWith(getMaxConfigPanelWidth(CANVAS_WIDTH));

    fireEvent.keyDown(getHandle(), { key: 'Home' });
    expect(onWidthChange).toHaveBeenLastCalledWith(MIN_CONFIG_PANEL_WIDTH);
  });

  it('does not commit when the key would not change the width', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} initialWidth={MIN_CONFIG_PANEL_WIDTH} />, {
      wrapper: TestProvider,
    });

    fireEvent.keyDown(getHandle(), { key: 'ArrowRight' });
    fireEvent.keyDown(getHandle(), { key: 'Tab' });

    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it('applies pointer drags live but commits once on release', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} />, { wrapper: TestProvider });
    const handle = getHandle();

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 1000 });
    for (let i = 1; i <= 40; i++) {
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1000 - i * 5 });
    }

    // 40 moves of 5px to the left: the panel follows without persisting.
    expect(onWidthChange).not.toHaveBeenCalled();
    expect(getContainer()).toHaveStyle({ width: '600px' });
    expect(handle).toHaveAttribute('aria-valuenow', '600');

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 800 });

    expect(onWidthChange).toHaveBeenCalledTimes(1);
    expect(onWidthChange).toHaveBeenCalledWith(600);
    expect(getContainer()).toHaveStyle({ width: '600px' });
  });

  it('does not commit a drag that ends where it started', () => {
    const onWidthChange = jest.fn();
    render(<Harness onWidthChange={onWidthChange} />, { wrapper: TestProvider });
    const handle = getHandle();

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 1000 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 900 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1000 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 1000 });

    expect(onWidthChange).not.toHaveBeenCalled();
  });
});
