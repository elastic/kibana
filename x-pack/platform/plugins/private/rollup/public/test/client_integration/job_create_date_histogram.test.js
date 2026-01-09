/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { fireEvent, screen } from '@testing-library/react';

import { mockHttpRequest, renderJobCreate } from './helpers';
import { setHttp, init as initDocumentation } from '../../crud_app/services';
import { docLinksServiceMock, coreMock } from '@kbn/core/public/mocks';

describe('Create Rollup Job, step 2: Date histogram', () => {
  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));
  const clickBack = () => fireEvent.click(screen.getByTestId('rollupJobBackButton'));

  const goToStep2 = async () => {
    setInputValue('rollupJobName', 'test-job');
    setInputValue('rollupIndexPattern', 'kibana*');
    setInputValue('rollupIndexName', 'rollup-index');
    await screen.findByTestId('fieldIndexPatternSuccessMessage');
    clickNext();
    await screen.findByTestId('rollupJobCreateDateHistogramTitle');
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
    mockHttpRequest(startMock.http);
    renderJobCreate();
    await screen.findByTestId('rollupJobCreateLogisticsTitle');
  });

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep2();
    });

    it('should have the horizontal step active on "Date histogram"', () => {
      expect(screen.getByTestId(/createRollupStep2--active/)).toHaveTextContent('Date histogram');
    });

    it('should have the title set to "Date histogram"', () => {
      expect(screen.getByTestId('rollupJobCreateDateHistogramTitle')).toBeInTheDocument();
    });

    it('should have a link to the documentation', () => {
      expect(screen.getByTestId('rollupJobCreateDateHistogramDocsButton')).toBeInTheDocument();
    });

    test('should have a deprecation callout', () => {
      expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
    });

    it('should have the "next" and "back" button visible', () => {
      expect(screen.getByTestId('rollupJobBackButton')).toBeInTheDocument();
      expect(screen.getByTestId('rollupJobNextButton')).toBeInTheDocument();
      expect(screen.queryByTestId('rollupJobSaveButton')).not.toBeInTheDocument();
    });

    it('should go to the "Logistics" step when clicking the back button', async () => {
      clickBack();
      expect(await screen.findByTestId('rollupJobCreateLogisticsTitle')).toBeInTheDocument();
    });
  });

  describe('Date field select', () => {
    it('should set the options value from the index pattern', async () => {
      const dateFields = ['field1', 'field2', 'field3'];
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { dateFields } });

      await goToStep2();

      const select = screen.getByTestId('rollupJobCreateDateFieldSelect');
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
      expect(options).toEqual(dateFields);
    });

    it('should sort the options in ascending order', async () => {
      const dateFields = ['field3', 'field2', 'field1'];
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { dateFields } });

      await goToStep2();

      const select = screen.getByTestId('rollupJobCreateDateFieldSelect');
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
      expect(options).toEqual(dateFields.sort());
    });
  });

  describe('time zone', () => {
    it('should have a select with all the timezones', async () => {
      await goToStep2();

      const timeZoneSelect = screen.getByTestId('rollupJobCreateTimeZoneSelect');
      const options = Array.from(timeZoneSelect.querySelectorAll('option')).map(
        (o) => o.textContent
      );
      expect(options).toEqual(moment.tz.names());
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      await goToStep2();
    });

    it('should display errors when clicking "next" without filling the form', () => {
      expect(screen.queryByTestId('rollupJobCreateStepError')).not.toBeInTheDocument();

      clickNext();

      expect(screen.getByTestId('rollupJobCreateStepError')).toBeInTheDocument();
      expect(document.body.textContent).toContain('Interval is required.');
      expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
    });

    describe('interval', () => {
      afterEach(() => {
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should validate the interval format', () => {
        setInputValue('rollupJobInterval', 'abc');
        clickNext();
        expect(document.body.textContent).toContain('Invalid interval format.');
      });

      it('should validate the calendar format', () => {
        setInputValue('rollupJobInterval', '3y');
        clickNext();
        expect(document.body.textContent).toContain('unit only allows values of 1.');
        expect(document.body.textContent).toContain('Try 1y.');
      });
    });
  });
});
