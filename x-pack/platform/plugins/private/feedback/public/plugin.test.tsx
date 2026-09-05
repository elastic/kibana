/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { FeedbackPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';

let lastMounted: React.ReactNode;

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: React.ReactElement) => {
    lastMounted = node;
    return () => () => undefined;
  },
}));

const findGetAppDetails = (
  node: React.ReactNode
):
  | (() => {
      title: string;
      id: string;
      url: string;
      context?: Record<string, string | boolean | number>;
    })
  | undefined => {
  if (!React.isValidElement(node)) {
    return undefined;
  }
  if (typeof node.props.getAppDetails === 'function') {
    return node.props.getAppDetails;
  }
  for (const child of React.Children.toArray(node.props.children)) {
    const found = findGetAppDetails(child);
    if (found) {
      return found;
    }
  }
  return undefined;
};

describe('Feedback Plugin', () => {
  let coreStartMock: ReturnType<typeof coreMock.createStart>;
  let cloudStartMock: ReturnType<typeof cloudMock.createStart>;
  let isOptedIn$: Subject<boolean>;
  let currentAppId$: BehaviorSubject<string | undefined>;
  let telemetryStartMock: TelemetryPluginStart;
  let plugin: FeedbackPlugin;

  const startPlugin = () =>
    plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

  const enableFeedback = () => coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);

  const getAppDetailsFromModal = () => {
    isOptedIn$.next(true);
    const [handler] = coreStartMock.chrome.next.registerFeedbackHandler.mock.calls[0];
    handler();
    const getAppDetails = findGetAppDetails(lastMounted);
    if (!getAppDetails) {
      throw new Error('getAppDetails was not found on the feedback modal');
    }
    return getAppDetails;
  };

  beforeEach(() => {
    lastMounted = undefined;
    coreStartMock = coreMock.createStart();
    cloudStartMock = cloudMock.createStart();
    isOptedIn$ = new Subject<boolean>();
    currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    coreStartMock.application.currentAppId$ = currentAppId$;
    // The plugin only consumes `isOptedIn$`, so a Subject we can emit on is all we need.
    telemetryStartMock = {
      telemetryService: { isOptedIn$ },
    } as unknown as TelemetryPluginStart;
    plugin = new FeedbackPlugin();
  });

  it('does not register the feedback handler when feedback is disabled', () => {
    coreStartMock.notifications.feedback.isEnabled.mockReturnValue(false);

    startPlugin();

    expect(coreStartMock.chrome.next.registerFeedbackHandler).not.toHaveBeenCalled();
  });

  it('registers the feedback handler only once opt-in resolves to true', () => {
    enableFeedback();
    startPlugin();

    expect(coreStartMock.chrome.next.registerFeedbackHandler).not.toHaveBeenCalled();

    isOptedIn$.next(true);

    expect(coreStartMock.chrome.next.registerFeedbackHandler).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('unregisters the feedback handler when opt-in becomes false', () => {
    enableFeedback();
    const unregister = jest.fn();
    coreStartMock.chrome.next.registerFeedbackHandler.mockReturnValue(unregister);

    startPlugin();

    isOptedIn$.next(true);
    expect(coreStartMock.chrome.next.registerFeedbackHandler).toHaveBeenCalledTimes(1);

    isOptedIn$.next(false);
    expect(unregister).toHaveBeenCalled();
  });

  describe('setContext', () => {
    it('no-ops when appId does not match the current app', () => {
      enableFeedback();
      const { setContext } = startPlugin();
      currentAppId$.next('dashboard');

      setContext('discover', { isEsql: true });

      expect(getAppDetailsFromModal()().context).toBeUndefined();
    });

    it('stores context only while appId is the current app', () => {
      enableFeedback();
      const { setContext } = startPlugin();
      currentAppId$.next('discover');

      setContext('discover', { isEsql: true });

      expect(getAppDetailsFromModal()().context).toEqual({ isEsql: true });
    });

    it('clears context when the current app changes', () => {
      enableFeedback();
      const { setContext } = startPlugin();
      currentAppId$.next('discover');
      setContext('discover', { isEsql: true });

      currentAppId$.next('dashboard');

      expect(getAppDetailsFromModal()().context).toBeUndefined();
    });

    it('clears context on unregister', () => {
      enableFeedback();
      const { setContext } = startPlugin();
      currentAppId$.next('discover');
      const unregister = setContext('discover', { isEsql: true });

      unregister();

      expect(getAppDetailsFromModal()().context).toBeUndefined();
    });

    it('uses options.title as a full app title override', () => {
      enableFeedback();
      const { setContext } = startPlugin();
      currentAppId$.next('discover');

      setContext('discover', { isEsql: true }, { title: 'Analytics - Discover ES|QL' });

      expect(getAppDetailsFromModal()()).toEqual(
        expect.objectContaining({
          title: 'Analytics - Discover ES|QL',
          context: { isEsql: true },
        })
      );
    });
  });
});
