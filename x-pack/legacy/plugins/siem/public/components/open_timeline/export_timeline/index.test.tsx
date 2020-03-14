/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mockSelectedTimeline } from './mocks';
import { mount } from 'enzyme';
import { useExportTimeline, ExportTimeline } from '.';
import { get } from 'lodash/fp';

describe('useExportTimeline', () => {
  describe('call with selected timelines', () => {
    let exportTimelineRes: ExportTimeline;
    const TestHook = () => {
      exportTimelineRes = useExportTimeline({
        selectedItems: mockSelectedTimeline,
        setActionTimeline: jest.fn(),
      });
      return <div />;
    };

    beforeAll(() => {
      mount(<TestHook />);
    });

    test('Downloader should be disabled by default', () => {
      expect(exportTimelineRes.isEnableDownloader).toBeFalsy();
    });

    test('exportedIds should include timelineId', () => {
      expect(get('exportedIds[0].timelineId', exportTimelineRes)).toEqual(
        mockSelectedTimeline[0].savedObjectId
      );
    });
  });

  describe('call without selected timelines', () => {
    let exportTimelineRes: ExportTimeline;
    const TestHook = () => {
      exportTimelineRes = useExportTimeline({
        selectedItems: undefined,
        setActionTimeline: jest.fn(),
      });
      return <div />;
    };

    beforeAll(() => {
      mount(<TestHook />);
    });

    test('should contain exportedIds', () => {
      expect(exportTimelineRes?.hasOwnProperty('exportedIds')).toBeTruthy();
    });

    test('should have no exportedIds', () => {
      expect(exportTimelineRes.exportedIds).toBeUndefined();
    });
  });
});
