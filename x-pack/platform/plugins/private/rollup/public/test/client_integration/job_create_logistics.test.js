/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';

import { mockHttpRequest, renderJobCreate } from './helpers';
import { ILLEGAL_CHARACTERS_VISIBLE } from '@kbn/data-views-plugin/public';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import { setHttp, init as initDocumentation } from '../../crud_app/services';

describe('Create Rollup Job, step 1: Logistics', () => {
  let startMock;

  const setInputValue = (testId, value) => {
    const input = screen.getByTestId(testId);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const clickNext = () => fireEvent.click(screen.getByTestId('rollupJobNextButton'));

  beforeEach(async () => {
    jest.clearAllMocks();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());

    mockHttpRequest(startMock.http);
    renderJobCreate();

    await screen.findByTestId('rollupJobCreateLogisticsTitle');
  });

  it('should have the horizontal step active on "Logistics"', () => {
    expect(screen.getByTestId(/createRollupStep1--active/)).toBeInTheDocument();
  });

  it('should have the title set to "Logistics"', () => {
    expect(screen.getByTestId('rollupJobCreateLogisticsTitle')).toBeInTheDocument();
  });

  it('should have a link to the documentation', () => {
    expect(screen.getByTestId('rollupJobCreateLogisticsDocsButton')).toBeInTheDocument();
  });

  test('should have a deprecation callout', () => {
    expect(screen.getByTestId('rollupDeprecationCallout')).toBeInTheDocument();
  });

  it('should only have the "next" button visible', () => {
    expect(screen.queryByTestId('rollupJobBackButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('rollupJobNextButton')).toBeInTheDocument();
    expect(screen.queryByTestId('rollupJobSaveButton')).not.toBeInTheDocument();
  });

  it('should display errors when clicking "next" without filling the form', async () => {
    expect(screen.queryByTestId('rollupJobCreateStepError')).not.toBeInTheDocument();

    clickNext();

    expect(await screen.findByTestId('rollupJobCreateStepError')).toBeInTheDocument();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(await screen.findByText('Index pattern is required.')).toBeInTheDocument();
    expect(await screen.findByText('Rollup index is required.')).toBeInTheDocument();
    expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
  });

  describe('form validations', () => {
    describe('index pattern', () => {
      beforeEach(() => {
        // Keep non-index-pattern fields valid so the tests focus on indexPattern validation.
        setInputValue('rollupJobName', 'test-job');
        setInputValue('rollupIndexName', 'rollup-index');
      });

      it('should not allow spaces', async () => {
        expect(screen.getByTestId('rollupJobNextButton')).not.toBeDisabled();
        setInputValue('rollupIndexPattern', 'with space');
        // Wait for async index pattern validation to finish (errors are hidden while validating).
        await screen.findByTestId('fieldIndexPatternSuccessMessage');
        clickNext();
        await waitFor(() => {
          expect(document.body.textContent).toContain('Remove the spaces from your index pattern.');
        });
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should not allow an unknown index pattern', async () => {
        expect(screen.getByTestId('rollupJobNextButton')).not.toBeDisabled();
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { doesMatchIndices: false } });
        setInputValue('rollupIndexPattern', 'unknown');
        await waitFor(() => {
          expect(document.body.textContent).toContain("Index pattern doesn't match any indices.");
        });
        clickNext();
        expect(
          await screen.findByText("Index pattern doesn't match any indices.")
        ).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should not allow an index pattern without time fields', async () => {
        expect(screen.getByTestId('rollupJobNextButton')).not.toBeDisabled();
        mockHttpRequest(startMock.http, { indxPatternVldtResp: { dateFields: [] } });
        setInputValue('rollupIndexPattern', 'abc');
        await waitFor(() => {
          expect(document.body.textContent).toContain(
            'Index pattern must match indices that contain time fields.'
          );
        });
        clickNext();
        expect(
          await screen.findByText('Index pattern must match indices that contain time fields.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should not allow an index pattern that matches a rollup index', async () => {
        expect(screen.getByTestId('rollupJobNextButton')).not.toBeDisabled();
        mockHttpRequest(startMock.http, {
          indxPatternVldtResp: { doesMatchRollupIndices: true },
        });
        setInputValue('rollupIndexPattern', 'abc');
        await waitFor(() => {
          expect(document.body.textContent).toContain(
            'Index pattern must not match rollup indices.'
          );
        });
        clickNext();
        expect(
          await screen.findByText('Index pattern must not match rollup indices.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should not be the same as the rollup index name', async () => {
        expect(screen.getByTestId('rollupJobNextButton')).not.toBeDisabled();
        setInputValue('rollupJobName', 'test-job');
        setInputValue('rollupIndexPattern', 'abc');
        setInputValue('rollupIndexName', 'abc');
        await screen.findByTestId('fieldIndexPatternSuccessMessage');
        clickNext();
        await waitFor(() => {
          expect(document.body.textContent).toContain(
            'Index pattern cannot have the same as the rollup index.'
          );
        });
        await waitFor(() => {
          expect(document.body.textContent).toContain(
            'Rollup index cannot have the same as the index pattern.'
          );
        });
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });
    });

    describe('rollup index name', () => {
      beforeEach(async () => {
        // Keep other fields valid so tests focus on rollupIndex validation.
        setInputValue('rollupJobName', 'test-job');
        setInputValue('rollupIndexPattern', 'kibana*');
        await screen.findByTestId('fieldIndexPatternSuccessMessage');
      });

      it('should not allow spaces', () => {
        setInputValue('rollupIndexName', 'with space');
        clickNext();
        expect(
          screen.getByText('Remove the spaces from your rollup index name.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should not allow invalid characters', () => {
        const expectInvalidChar = async (char) => {
          setInputValue('rollupIndexName', `rollup_index_${char}`);
          clickNext();
          await waitFor(() => {
            expect(document.body.textContent).toContain(
              `Remove the characters ${char} from your rollup index name.`
            );
          });
          expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
        };

        // Run sequentially; each mutation updates shared UI state.
        return [...ILLEGAL_CHARACTERS_VISIBLE, ','].reduce(
          (p, char) => p.then(() => expectInvalidChar(char)),
          Promise.resolve()
        );
      });

      it('should not allow a dot as first character', () => {
        setInputValue('rollupIndexName', '.kibana');
        clickNext();
        expect(screen.getByText('Index names cannot begin with periods.')).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });
    });

    describe('rollup cron', () => {
      const changeFrequency = (value) => {
        const select = screen
          .getAllByTestId('cronFrequencySelect')
          .find((el) => el.tagName === 'SELECT');
        fireEvent.change(select ?? screen.getByTestId('cronFrequencySelect'), {
          target: { value },
        });
      };

      const generateStringSequenceOfNumbers = (total) =>
        new Array(total).fill('').map((_, i) => (i < 10 ? `0${i}` : i.toString()));

      describe('frequency', () => {
        it('should allow "minute", "hour", "day", "week", "month", "year"', () => {
          const select = screen
            .getAllByTestId('cronFrequencySelect')
            .find((el) => el.tagName === 'SELECT');
          const options = Array.from(
            (select ?? screen.getByTestId('cronFrequencySelect')).querySelectorAll('option')
          ).map((o) => o.textContent);
          expect(options).toEqual(['minute', 'hour', 'day', 'week', 'month', 'year']);
        });

        it('should default to "WEEK"', () => {
          const select = screen
            .getAllByTestId('cronFrequencySelect')
            .find((el) => el.tagName === 'SELECT');
          expect((select ?? screen.getByTestId('cronFrequencySelect')).value).toBe('WEEK');
        });

        describe('every minute', () => {
          it('should not have any additional configuration', () => {
            changeFrequency('MINUTE');
            expect(screen.queryByTestId('cronFrequencyConfiguration')).not.toBeInTheDocument();
          });
        });

        describe('hourly', () => {
          beforeEach(() => {
            changeFrequency('HOUR');
          });

          it('should have 1 additional configuration', () => {
            expect(screen.getByTestId('cronFrequencyHourlyMinuteSelect')).toBeInTheDocument();
          });

          it('should allow to select any minute from 00 -> 59', () => {
            const minuteSelect = screen.getByTestId('cronFrequencyHourlyMinuteSelect');
            const options = Array.from(minuteSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('daily', () => {
          beforeEach(() => {
            changeFrequency('DAY');
          });

          it('should have 1 additional configuration with hour and minute selects', () => {
            expect(screen.getByTestId('cronFrequencyDailyHourSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyDailyMinuteSelect')).toBeInTheDocument();
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = screen.getByTestId('cronFrequencyDailyHourSelect');
            const options = Array.from(hourSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minuteSelect = screen.getByTestId('cronFrequencyDailyMinuteSelect');
            const options = Array.from(minuteSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('weekly', () => {
          beforeEach(() => {
            changeFrequency('WEEK');
          });

          it('should have 2 additional configurations with day, hour and minute selects', () => {
            expect(screen.getByTestId('cronFrequencyWeeklyDaySelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyWeeklyHourSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyWeeklyMinuteSelect')).toBeInTheDocument();
          });

          it('should allow to select any day of the week', () => {
            const daySelect = screen.getByTestId('cronFrequencyWeeklyDaySelect');
            const options = Array.from(daySelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual([
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ]);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = screen.getByTestId('cronFrequencyWeeklyHourSelect');
            const options = Array.from(hourSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minuteSelect = screen.getByTestId('cronFrequencyWeeklyMinuteSelect');
            const options = Array.from(minuteSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('monthly', () => {
          beforeEach(() => {
            changeFrequency('MONTH');
          });

          it('should have 2 additional configurations with date, hour and minute selects', () => {
            expect(screen.getByTestId('cronFrequencyMonthlyDateSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyMonthlyHourSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyMonthlyMinuteSelect')).toBeInTheDocument();
          });

          it('should allow to select any date of the month from 1st to 31st', () => {
            const dateSelect = screen.getByTestId('cronFrequencyMonthlyDateSelect');
            const options = Array.from(dateSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toHaveLength(31);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = screen.getByTestId('cronFrequencyMonthlyHourSelect');
            const options = Array.from(hourSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minuteSelect = screen.getByTestId('cronFrequencyMonthlyMinuteSelect');
            const options = Array.from(minuteSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });

        describe('yearly', () => {
          beforeEach(() => {
            changeFrequency('YEAR');
          });

          it('should have 3 additional configurations with month, date, hour and minute selects', () => {
            expect(screen.getByTestId('cronFrequencyYearlyMonthSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyYearlyDateSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyYearlyHourSelect')).toBeInTheDocument();
            expect(screen.getByTestId('cronFrequencyYearlyMinuteSelect')).toBeInTheDocument();
          });

          it('should allow to select any month of the year', () => {
            const monthSelect = screen.getByTestId('cronFrequencyYearlyMonthSelect');
            const options = Array.from(monthSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual([
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ]);
          });

          it('should allow to select any date of the month from 1st to 31st', () => {
            const dateSelect = screen.getByTestId('cronFrequencyYearlyDateSelect');
            const options = Array.from(dateSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toHaveLength(31);
          });

          it('should allow to select any hour from 00 -> 23', () => {
            const hourSelect = screen.getByTestId('cronFrequencyYearlyHourSelect');
            const options = Array.from(hourSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(24));
          });

          it('should allow to select any miute from 00 -> 59', () => {
            const minuteSelect = screen.getByTestId('cronFrequencyYearlyMinuteSelect');
            const options = Array.from(minuteSelect.querySelectorAll('option')).map(
              (o) => o.textContent
            );
            expect(options).toEqual(generateStringSequenceOfNumbers(60));
          });
        });
      });

      describe('advanced cron expression', () => {
        const activateAdvancedCronExpression = () => {
          fireEvent.click(screen.getByTestId('rollupShowAdvancedCronLink'));
        };

        it('should allow to create a cron expression', () => {
          expect(screen.queryByTestId('rollupAdvancedCron')).not.toBeInTheDocument();

          activateAdvancedCronExpression();

          expect(screen.getByTestId('rollupAdvancedCron')).toBeInTheDocument();
        });

        it('should not be empty', () => {
          activateAdvancedCronExpression();

          setInputValue('rollupAdvancedCron', '');
          clickNext();
          expect(
            screen.getByText('Cron pattern or basic interval is required.')
          ).toBeInTheDocument();
        });

        it('should not allow unvalid expression', () => {
          activateAdvancedCronExpression();

          setInputValue('rollupAdvancedCron', 'invalid');
          clickNext();
          expect(
            screen.getByText('Expression has only 1 part. At least 5 parts are required.')
          ).toBeInTheDocument();
        });
      });
    });

    describe('page size', () => {
      beforeEach(async () => {
        setInputValue('rollupJobName', 'test-job');
        setInputValue('rollupIndexPattern', 'kibana*');
        setInputValue('rollupIndexName', 'rollup-index');
        await screen.findByTestId('fieldIndexPatternSuccessMessage');
      });

      it('should not be empty', () => {
        setInputValue('rollupPageSize', '');
        clickNext();
        expect(screen.getByText('Page size is required.')).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should be greater than 0', () => {
        setInputValue('rollupPageSize', '-1');
        clickNext();
        expect(screen.getByText('Page size must be greater than zero.')).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });
    });

    describe('delay', () => {
      beforeEach(async () => {
        setInputValue('rollupJobName', 'test-job');
        setInputValue('rollupIndexPattern', 'kibana*');
        setInputValue('rollupIndexName', 'rollup-index');
        await screen.findByTestId('fieldIndexPatternSuccessMessage');
      });

      it('should validate the interval format', () => {
        setInputValue('rollupDelay', 'abc');
        clickNext();
        expect(screen.getByText('Invalid delay format.')).toBeInTheDocument();
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });

      it('should validate the calendar format', () => {
        setInputValue('rollupDelay', '3y');
        clickNext();
        expect(document.body.textContent).toContain('unit only allows values of 1.');
        expect(document.body.textContent).toContain('Try 1y.');
        expect(screen.getByTestId('rollupJobNextButton')).toBeDisabled();
      });
    });
  });
});
