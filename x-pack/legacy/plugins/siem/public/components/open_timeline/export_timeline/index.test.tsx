/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mockSelectedTimeline } from './mocks';
import { ReactWrapper, mount } from 'enzyme';
import { useExportTimeline, ExportTimeline } from '.';
import { get } from 'lodash/fp';

describe('useExportTimeline', () => {
  describe('call with selected timelines', () => {
    let wrapper: ReactWrapper;
    let exportTimelineRes: ExportTimeline;
    const TestHook = () => {
      exportTimelineRes = useExportTimeline(mockSelectedTimeline);
      return <div />;
    };

    beforeAll(() => {
      wrapper = mount(<TestHook />);
    });

    test('Downloader should be disabled by default', () => {
      expect(exportTimelineRes.enableDownloader).toBeFalsy();
    });

    test('exportedIds should include timelineId', () => {
      expect(get('exportedIds[0].timelineId', exportTimelineRes)).toEqual(
        mockSelectedTimeline[0].savedObjectId
      );
    });

    test('exportedIds should include noteIds', () => {
      expect(get('exportedIds[0].noteIds', exportTimelineRes)).toEqual([
        mockSelectedTimeline[0].notes[0].noteId,
        mockSelectedTimeline[0].notes[1].noteId,
      ]);
    });

    test('exportedIds should include pinnedEventIds', () => {
      expect(get('exportedIds[0].pinnedEventIds', exportTimelineRes)).toEqual(
        Object.keys(mockSelectedTimeline[0].pinnedEventIds)
      );
    });
  });

  describe('call without selected timelines', () => {
    let wrapper: ReactWrapper;
    let exportTimelineRes: ExportTimeline;
    const TestHook = () => {
      exportTimelineRes = useExportTimeline(undefined);
      return <div />;
    };

    beforeAll(() => {
      wrapper = mount(<TestHook />);
    });

    test('should contain exportedIds', () => {
      expect(exportTimelineRes?.hasOwnProperty('exportedIds')).toBeTruthy();
    });

    test('should have no exportedIds', () => {
      expect(exportTimelineRes.exportedIds).toBeUndefined();
    });
  });
});
