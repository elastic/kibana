/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useFlyoutBodyAvailableHeight } from './use_flyout_body_available_height';

const EDITOR_BOTTOM_BUFFER_PX = 2;

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  static observedElements: Element[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element) {
    MockResizeObserver.observedElements.push(el);
  }

  unobserve() {}
  disconnect() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const Probe = ({
  onHeight,
  enabled = true,
}: {
  onHeight: (h: number) => void;
  enabled?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(ref as React.RefObject<HTMLElement | null>, enabled);
  onHeight(height);
  return <div ref={ref} data-test-subj="probe" />;
};

const renderInsideFlyoutBody = ({
  flyoutBottom,
  wrapperTop,
  panelPaddingBottom = '16px',
  withOverflowContent = false,
  enabled = true,
}: {
  flyoutBottom: number;
  wrapperTop: number;
  panelPaddingBottom?: string;
  withOverflowContent?: boolean;
  enabled?: boolean;
}) => {
  const heights: number[] = [];

  const originalGetRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('euiFlyoutBody__overflow')) {
      return { bottom: flyoutBottom } as DOMRect;
    }
    if ((this as HTMLElement).dataset?.testSubj === 'probe') {
      return { top: wrapperTop } as DOMRect;
    }
    return originalGetRect.call(this);
  };

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = ((el: Element) => {
    if (el.classList.contains('euiPanel')) {
      return { paddingBottom: panelPaddingBottom } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(el);
  }) as typeof window.getComputedStyle;

  const probe = <Probe onHeight={(h) => heights.push(h)} enabled={enabled} />;

  const utils = render(
    withOverflowContent ? (
      <div className="euiFlyoutBody__overflow">
        <div className="euiFlyoutBody__overflowContent">{probe}</div>
      </div>
    ) : (
      <div className="euiFlyoutBody__overflow">
        <div className="euiPanel">{probe}</div>
      </div>
    )
  );

  const restore = () => {
    Element.prototype.getBoundingClientRect = originalGetRect;
    window.getComputedStyle = originalGetComputedStyle;
  };

  return { heights, restore, ...utils };
};

describe('useFlyoutBodyAvailableHeight', () => {
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    MockResizeObserver.observedElements = [];
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('returns flyoutBottom - wrapperTop - panel paddingBottom - buffer', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1500,
      wrapperTop: 100,
      panelPaddingBottom: '16px',
    });
    expect(heights.at(-1)).toBe(1500 - 100 - 16 - EDITOR_BOTTOM_BUFFER_PX);
    restore();
  });

  it('skips panel padding when overflowContent is present', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1500,
      wrapperTop: 100,
      panelPaddingBottom: '16px',
      withOverflowContent: true,
    });
    expect(heights.at(-1)).toBe(1500 - 100 - EDITOR_BOTTOM_BUFFER_PX);
    restore();
  });

  it('handles a zero-padding panel', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1000,
      wrapperTop: 50,
      panelPaddingBottom: '0px',
    });
    expect(heights.at(-1)).toBe(1000 - 50 - EDITOR_BOTTOM_BUFFER_PX);
    restore();
  });

  it('clamps negative results to 0', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 100,
      wrapperTop: 200,
      panelPaddingBottom: '16px',
    });
    expect(heights.at(-1)).toBe(0);
    restore();
  });

  it('returns 0 when enabled is false', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1500,
      wrapperTop: 100,
      enabled: false,
    });
    expect(heights.at(-1)).toBe(0);
    restore();
  });

  it('re-measures when ResizeObserver fires', () => {
    let currentFlyoutBottom = 1500;
    const heights: number[] = [];

    const originalGetRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList.contains('euiFlyoutBody__overflow')) {
        return { bottom: currentFlyoutBottom } as DOMRect;
      }
      if ((this as HTMLElement).dataset?.testSubj === 'probe') {
        return { top: 100 } as DOMRect;
      }
      return originalGetRect.call(this);
    };

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = ((el: Element) => {
      if (el.classList.contains('euiPanel')) {
        return { paddingBottom: '16px' } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(el);
    }) as typeof window.getComputedStyle;

    render(
      <div className="euiFlyoutBody__overflow">
        <div className="euiPanel">
          <Probe onHeight={(h) => heights.push(h)} />
        </div>
      </div>
    );

    expect(heights.at(-1)).toBe(1500 - 100 - 16 - EDITOR_BOTTOM_BUFFER_PX);

    currentFlyoutBottom = 2000;
    act(() => {
      MockResizeObserver.instances[0].trigger();
    });

    expect(heights.at(-1)).toBe(2000 - 100 - 16 - EDITOR_BOTTOM_BUFFER_PX);

    Element.prototype.getBoundingClientRect = originalGetRect;
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('does not observe document.body', () => {
    const { restore } = renderInsideFlyoutBody({
      flyoutBottom: 1500,
      wrapperTop: 100,
    });

    expect(MockResizeObserver.observedElements).not.toContain(document.body);
    restore();
  });

  it('returns 0 when not rendered inside an EuiFlyoutBody', () => {
    const heights: number[] = [];
    render(
      <div>
        <Probe onHeight={(h) => heights.push(h)} />
      </div>
    );
    expect(heights.at(-1)).toBe(0);
  });
});
