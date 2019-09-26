/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Delayed } from './index';

// Advanced time like setTimeout and mocks Date.now() to stay in sync
class AdvanceTimer {
  public nowTime = 0;
  public advance(ms: number) {
    this.nowTime += ms;
    jest.spyOn(Date, 'now').mockReturnValue(this.nowTime);
    jest.advanceTimersByTime(ms);
  }
}

describe('Delayed', () => {
  it('should not flicker between show/hide when the hide interval is very short', async () => {
    jest.useFakeTimers();
    const visibilityChanges: boolean[] = [];
    const advanceTimer = new AdvanceTimer();
    const delayed = new Delayed();

    delayed.onChange(isVisible => visibilityChanges.push(isVisible));

    for (let i = 1; i < 100; i += 2) {
      delayed.show();
      advanceTimer.advance(1000);
      delayed.hide();
      advanceTimer.advance(20);
    }
    advanceTimer.advance(100);

    expect(visibilityChanges).toEqual([true, false]);
  });

  it('should not be shown at all when the duration is very short', async () => {
    jest.useFakeTimers();
    const advanceTimer = new AdvanceTimer();
    const visibilityChanges: boolean[] = [];
    const delayed = new Delayed();

    delayed.onChange(isVisible => visibilityChanges.push(isVisible));

    delayed.show();
    advanceTimer.advance(30);
    delayed.hide();
    advanceTimer.advance(1000);

    expect(visibilityChanges).toEqual([]);
  });

  it('should be displayed for minimum 1000ms', async () => {
    jest.useFakeTimers();
    const visibilityChanges: boolean[] = [];
    const advanceTimer = new AdvanceTimer();
    const delayed = new Delayed();

    delayed.onChange(isVisible => visibilityChanges.push(isVisible));

    delayed.show();
    advanceTimer.advance(200);
    delayed.hide();
    advanceTimer.advance(950);
    expect(visibilityChanges).toEqual([true]);
    advanceTimer.advance(100);
    expect(visibilityChanges).toEqual([true, false]);
    delayed.show();
    advanceTimer.advance(50);
    expect(visibilityChanges).toEqual([true, false, true]);
    delayed.hide();
    advanceTimer.advance(950);
    expect(visibilityChanges).toEqual([true, false, true]);
    advanceTimer.advance(100);
    expect(visibilityChanges).toEqual([true, false, true, false]);
  });

  it('should be displayed for minimum 2000ms', async () => {
    jest.useFakeTimers();
    const visibilityChanges: boolean[] = [];
    const advanceTimer = new AdvanceTimer();
    const delayed = new Delayed({ minimumVisibleDuration: 2000 });

    delayed.onChange(isVisible => visibilityChanges.push(isVisible));

    delayed.show();
    advanceTimer.advance(200);
    delayed.hide();
    advanceTimer.advance(1950);
    expect(visibilityChanges).toEqual([true]);
    advanceTimer.advance(100);
    expect(visibilityChanges).toEqual([true, false]);
  });
});
