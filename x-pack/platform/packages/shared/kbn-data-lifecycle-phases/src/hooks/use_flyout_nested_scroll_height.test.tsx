/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useFlyoutNestedScrollHeight } from './use_flyout_nested_scroll_height';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe() {}

  disconnect() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const Probe = ({
  flyoutRef,
  onHeight,
}: {
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  onHeight: (height: number | undefined) => void;
}) => {
  const listAnchorRef = useRef<HTMLDivElement>(null);
  const height = useFlyoutNestedScrollHeight(flyoutRef, listAnchorRef);
  onHeight(height);
  return <div ref={listAnchorRef} data-test-subj="listAnchor" />;
};

const flushAnimationFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
};

describe('useFlyoutNestedScrollHeight', () => {
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('returns undefined when the element is not inside a flyout scroll container', () => {
    const flyoutRef = React.createRef<HTMLDivElement>();
    const heights: Array<number | undefined> = [];

    render(<Probe flyoutRef={flyoutRef} onHeight={(height) => heights.push(height)} />);

    expect(heights.at(-1)).toBeUndefined();
  });

  it('measures the distance from the anchor to the bottom of the flyout scroll container', async () => {
    const flyoutRef = React.createRef<HTMLDivElement>();
    const heights: Array<number | undefined> = [];
    const originalGetRect = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function () {
      if ((this as HTMLElement).dataset?.testSubj === 'flyoutScroll') {
        return { bottom: 500 } as DOMRect;
      }
      if ((this as HTMLElement).dataset?.testSubj === 'listAnchor') {
        return { top: 200 } as DOMRect;
      }
      return originalGetRect.call(this);
    };

    render(
      <div ref={flyoutRef} data-test-subj="flyoutScroll">
        <Probe flyoutRef={flyoutRef} onHeight={(height) => heights.push(height)} />
      </div>
    );

    await flushAnimationFrame();

    expect(heights.at(-1)).toBe(300);

    Element.prototype.getBoundingClientRect = originalGetRect;
  });

  it('clamps the result to a minimum height', async () => {
    const flyoutRef = React.createRef<HTMLDivElement>();
    const heights: Array<number | undefined> = [];
    const originalGetRect = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function () {
      if ((this as HTMLElement).dataset?.testSubj === 'flyoutScroll') {
        return { bottom: 500 } as DOMRect;
      }
      if ((this as HTMLElement).dataset?.testSubj === 'listAnchor') {
        return { top: 450 } as DOMRect;
      }
      return originalGetRect.call(this);
    };

    render(
      <div ref={flyoutRef} data-test-subj="flyoutScroll">
        <Probe flyoutRef={flyoutRef} onHeight={(height) => heights.push(height)} />
      </div>
    );

    await flushAnimationFrame();

    expect(heights.at(-1)).toBe(120);

    Element.prototype.getBoundingClientRect = originalGetRect;
  });

  it('re-measures when ResizeObserver fires', async () => {
    const flyoutRef = React.createRef<HTMLDivElement>();
    let flyoutBottom = 500;
    const heights: Array<number | undefined> = [];
    const originalGetRect = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function () {
      if ((this as HTMLElement).dataset?.testSubj === 'flyoutScroll') {
        return { bottom: flyoutBottom } as DOMRect;
      }
      if ((this as HTMLElement).dataset?.testSubj === 'listAnchor') {
        return { top: 200 } as DOMRect;
      }
      return originalGetRect.call(this);
    };

    render(
      <div ref={flyoutRef} data-test-subj="flyoutScroll">
        <Probe flyoutRef={flyoutRef} onHeight={(height) => heights.push(height)} />
      </div>
    );

    await flushAnimationFrame();

    expect(heights.at(-1)).toBe(300);

    flyoutBottom = 450;
    act(() => {
      MockResizeObserver.instances.forEach((instance) => instance.trigger());
    });

    expect(heights.at(-1)).toBe(250);

    Element.prototype.getBoundingClientRect = originalGetRect;
  });
});
