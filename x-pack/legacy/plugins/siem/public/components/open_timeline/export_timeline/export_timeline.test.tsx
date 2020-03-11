/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TimelineDownloader } from './export_timeline';
import { mockSelectedTimeline } from './mocks';
import { ReactWrapper, mount } from 'enzyme';
import { useExportTimeline } from '.';

jest.mock('../translations', () => {
  return {
    EXPORT_SELECTED: 'EXPORT_SELECTED',
    EXPORT_FILENAME: 'TIMELINE',
  };
});

jest.mock('.', () => {
  return {
    useExportTimeline: jest.fn(),
  };
});

describe('TimelineDownloader', () => {
  let wrapper: ReactWrapper;
  describe('render without selected timeline', () => {
    beforeAll(() => {
      ((useExportTimeline as unknown) as jest.Mock).mockReturnValue({
        enableDownloader: false,
        setEnableDownloader: jest.fn(),
        exportedIds: {},
        getExportedData: jest.fn(),
      });
      wrapper = mount(<TimelineDownloader selectedTimelines={[]} />);
    });

    afterAll(() => {
      ((useExportTimeline as unknown) as jest.Mock).mockReset();
    });

    test('Should render title', () => {
      expect(wrapper.text()).toEqual('EXPORT_SELECTED');
    });

    test('should render exportIcon', () => {
      expect(wrapper.find('[data-test-subj="export-timeline-icon"]').exists()).toBeTruthy();
    });

    test('should not be clickable', () => {
      expect(
        wrapper
          .find('[data-test-subj="export-timeline"]')
          .first()
          .prop('disabled')
      ).toBeTruthy();
    });

    test('should not render a downloader', () => {
      expect(wrapper.find('[data-test-subj="export-timeline-downloader"]').exists()).toBeFalsy();
    });
  });

  describe('render with a selected timeline', () => {
    beforeAll(() => {
      ((useExportTimeline as unknown) as jest.Mock).mockReturnValue({
        enableDownloader: true,
        setEnableDownloader: jest.fn(),
        exportedIds: {},
        getExportedData: jest.fn(),
      });
      wrapper = mount(<TimelineDownloader selectedTimelines={mockSelectedTimeline} />);
    });

    afterAll(() => {
      ((useExportTimeline as unknown) as jest.Mock).mockReset();
    });

    test('Should render title', () => {
      expect(wrapper.text()).toEqual('EXPORT_SELECTED');
    });

    test('should render exportIcon', () => {
      expect(wrapper.find('[data-test-subj="export-timeline-icon"]').exists()).toBeTruthy();
    });

    test('should be clickable', () => {
      expect(
        wrapper
          .find('[data-test-subj="export-timeline"]')
          .first()
          .prop('disabled')
      ).toBeFalsy();
    });

    test('should render a downloader', () => {
      expect(wrapper.find('[data-test-subj="export-timeline-downloader"]').exists()).toBeTruthy();
    });
  });
});
