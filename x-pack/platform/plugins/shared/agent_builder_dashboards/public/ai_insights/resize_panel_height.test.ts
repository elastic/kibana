/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import {
  contentHeightToGridRows,
  measureIntrinsicHeight,
  setAiInsightsPanelGridHeight,
} from './resize_panel_height';

describe('contentHeightToGridRows', () => {
  it('maps compact content to a small number of rows', () => {
    // Includes a small safety buffer so CTA edges aren't clipped.
    expect(contentHeightToGridRows(40)).toBeLessThanOrEqual(3);
  });

  it('grows with content height', () => {
    expect(contentHeightToGridRows(200)).toBeGreaterThan(contentHeightToGridRows(80));
  });
});

describe('measureIntrinsicHeight', () => {
  it('sums children height with padding and ignores a tall parent box', () => {
    const parent = document.createElement('div');
    parent.style.padding = '4px 8px';
    parent.style.border = '2px solid transparent';
    parent.style.height = '200px'; // stretched cell — must not win
    const child = document.createElement('div');
    Object.defineProperty(child, 'getBoundingClientRect', {
      value: () => ({ height: 32, width: 100, top: 0, left: 0, bottom: 32, right: 100 }),
    });
    Object.defineProperty(child, 'scrollHeight', { value: 32 });
    Object.defineProperty(parent, 'scrollHeight', { value: 44 });
    parent.appendChild(child);
    document.body.appendChild(parent);

    // jsdom computed padding/border are often 0; stub getComputedStyle for this node.
    const realGetComputedStyle = window.getComputedStyle;
    jest.spyOn(window, 'getComputedStyle').mockImplementation((elt) => {
      if (elt === parent) {
        return {
          paddingTop: '4px',
          paddingBottom: '4px',
          borderTopWidth: '2px',
          borderBottomWidth: '2px',
          rowGap: '0px',
          gap: '0px',
        } as CSSStyleDeclaration;
      }
      return realGetComputedStyle(elt);
    });

    expect(measureIntrinsicHeight(parent)).toBe(44); // 32 + 8 padding + 4 border
    document.body.removeChild(parent);
    jest.restoreAllMocks();
  });
});

describe('setAiInsightsPanelGridHeight', () => {
  it('updates the panel grid height and returns the previous value', () => {
    const layout$ = new BehaviorSubject({
      panels: {
        'panel-1': {
          type: 'ai_insights',
          grid: { x: 0, y: 0, w: 24, h: 20 },
        },
      },
      sections: {},
      pinnedPanels: {},
    });

    const previous = setAiInsightsPanelGridHeight({ layout$ }, 'panel-1', 3);

    expect(previous).toBe(20);
    expect(layout$.getValue().panels['panel-1'].grid.h).toBe(3);
  });

  it('returns undefined when the parent has no layout API', () => {
    expect(setAiInsightsPanelGridHeight({}, 'panel-1', 3)).toBeUndefined();
  });
});
