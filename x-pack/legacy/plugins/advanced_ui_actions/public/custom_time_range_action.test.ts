/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

jest.mock('ui/new_platform', () =>
  require('ui/new_platform/__mocks__/helpers').createUiNewPlatformMock()
);

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { skip } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { EmbeddableFactory } from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { TimeRangeEmbeddable, TimeRangeContainer, TIME_RANGE_EMBEDDABLE } from './test_helpers';
import { TimeRangeEmbeddableFactory } from './test_helpers/time_range_embeddable_factory';
import { CustomTimeRangeAction } from './custom_time_range_action';
import { mount } from 'enzyme';

test('Custom time range action prevents embeddable from using container time', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    embeddableFactories
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  expect(child1).toBeDefined();
  expect(child1.getInput().timeRange).toEqual({ from: 'now-15m', to: 'now' });

  const child2 = container.getChild<TimeRangeEmbeddable>('2');
  expect(child2).toBeDefined();
  expect(child2.getInput().timeRange).toEqual({ from: 'now-15m', to: 'now' });

  const overlayMock = npStart.core.overlays;
  (overlayMock.openModal as any).mockClear();
  new CustomTimeRangeAction({
    openModal: npStart.core.overlays.openModal,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  const openModal = (overlayMock.openModal as any).mock.calls[0][0];

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-30days', to: 'now-29days' } });

  findTestSubject(wrapper, 'addPerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: 'now-30days', to: 'now-29days' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-30m', to: 'now-1m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });
});

test('Removing custom time range action resets embeddable back to container time', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    embeddableFactories
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  const child2 = container.getChild<TimeRangeEmbeddable>('2');

  const overlayMock = npStart.core.overlays;
  (overlayMock.openModal as any).mockClear();
  new CustomTimeRangeAction({
    openModal: npStart.core.overlays.openModal,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  const openModal = (overlayMock.openModal as any).mock.calls[0][0];

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-30days', to: 'now-29days' } });

  findTestSubject(wrapper, 'addPerPanelTimeRangeButton').simulate('click');

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });

  new CustomTimeRangeAction({
    openModal: npStart.core.overlays.openModal,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  const openModal2 = (overlayMock.openModal as any).mock.calls[1][0];

  const wrapper2 = mount(openModal2);
  findTestSubject(wrapper2, 'removePerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-10m', to: 'now-5m' } });
});

test('Cancelling custom time range action leaves state alone', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
            timeRange: { to: '2', from: '1' },
          },
        },
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    embeddableFactories
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  const child2 = container.getChild<TimeRangeEmbeddable>('2');

  const overlayMock = npStart.core.overlays;
  (overlayMock.openModal as any).mockClear();
  new CustomTimeRangeAction({
    openModal: npStart.core.overlays.openModal,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  const openModal = (overlayMock.openModal as any).mock.calls[0][0];

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-300m', to: 'now-400m' } });

  findTestSubject(wrapper, 'cancelPerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: '1', to: '2' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-30m', to: 'now-1m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });
});

test(`badge is compatible with embeddable that inherits from parent`, async () => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    embeddableFactories
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const compatible = await new CustomTimeRangeAction({
    openModal: npStart.core.overlays.openModal,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(true);
});
