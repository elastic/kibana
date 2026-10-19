/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getAdminCapabilities } from '../../lib/capabilities/__mocks__/ml_capabilities';
import { createAdUpdateJobConfigTool } from './ad_update_job_config';
import { AD_UPDATE_JOB_CONFIG_TOOL_ID } from './tool_ids';

const resolveMlCapabilities = jest.fn().mockResolvedValue(getAdminCapabilities());
const adUpdateJobConfigTool = createAdUpdateJobConfigTool(resolveMlCapabilities);

const createMlMock = () => ({
  updateJob: jest.fn().mockResolvedValue({ job_id: 'my-job' }),
  updateDatafeed: jest.fn().mockResolvedValue({ datafeed_id: 'datafeed-my-job' }),
  putCalendar: jest.fn().mockResolvedValue({ calendar_id: 'calendar-my-job' }),
  putCalendarJob: jest.fn().mockResolvedValue({ calendar_id: 'calendar-my-job' }),
  getCalendarEvents: jest.fn().mockResolvedValue({ events: [] }),
  postCalendarEvents: jest.fn().mockResolvedValue({ events: [] }),
});

const createContext = (mlMock = createMlMock()) =>
  ({
    esClient: { asCurrentUser: { ml: mlMock } },
    request: {},
  } as any);

describe('adUpdateJobConfigTool', () => {
  it('has the correct ID and type', () => {
    expect(adUpdateJobConfigTool.id).toBe(AD_UPDATE_JOB_CONFIG_TOOL_ID);
    expect(adUpdateJobConfigTool.type).toBe(ToolType.builtin);
  });

  describe('handler', () => {
    it('operation=update_memory_limit calls ml.updateJob with analysis_limits', async () => {
      const ml = createMlMock();
      await adUpdateJobConfigTool.handler(
        { operation: 'update_memory_limit', job_id: 'my-job', memory_limit: '512mb' },
        createContext(ml)
      );
      expect(ml.updateJob).toHaveBeenCalledWith({
        job_id: 'my-job',
        body: { analysis_limits: { model_memory_limit: '512mb' } },
      });
    });

    it('operation=update_memory_limit infers job_id from a single job_ids entry', async () => {
      const ml = createMlMock();
      await adUpdateJobConfigTool.handler(
        { operation: 'update_memory_limit', job_ids: ['my-job'], memory_limit: '512mb' },
        createContext(ml)
      );
      expect(ml.updateJob).toHaveBeenCalledWith({
        job_id: 'my-job',
        body: { analysis_limits: { model_memory_limit: '512mb' } },
      });
    });

    it('operation=update_query_delay calls ml.updateDatafeed with query_delay', async () => {
      const ml = createMlMock();
      await adUpdateJobConfigTool.handler(
        { operation: 'update_query_delay', job_id: 'my-job', query_delay: '120s' },
        createContext(ml)
      );
      expect(ml.updateDatafeed).toHaveBeenCalledWith({
        datafeed_id: 'datafeed-my-job',
        body: { query_delay: '120s' },
      });
    });

    it('operation=update_delayed_data_check calls ml.updateDatafeed with delayed_data_check_config', async () => {
      const ml = createMlMock();
      const config = { enabled: true, check_window: '2h' };
      await adUpdateJobConfigTool.handler(
        { operation: 'update_delayed_data_check', job_id: 'my-job', delayed_data_check: config },
        createContext(ml)
      );
      expect(ml.updateDatafeed).toHaveBeenCalledWith({
        datafeed_id: 'datafeed-my-job',
        body: { delayed_data_check_config: config },
      });
    });

    it('operation=create_calendar_event PUTs calendar then posts events with default calendar_id', async () => {
      const ml = createMlMock();
      const event = {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-02T00:00:00Z',
        description: 'holiday',
      };
      await adUpdateJobConfigTool.handler(
        { operation: 'create_calendar_event', job_id: 'my-job', calendar_event: event },
        createContext(ml)
      );
      expect(ml.putCalendar).toHaveBeenCalledWith({
        calendar_id: 'calendar-my-job',
        job_ids: ['my-job'],
      });
      expect(ml.putCalendarJob).not.toHaveBeenCalled();
      expect(ml.getCalendarEvents).toHaveBeenCalledWith({ calendar_id: 'calendar-my-job' });
      expect(ml.postCalendarEvents).toHaveBeenCalledWith({
        calendar_id: 'calendar-my-job',
        events: [event],
      });
    });

    it('operation=create_calendar_event infers job_id when job_ids has one entry', async () => {
      const ml = createMlMock();
      const event = {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-02T00:00:00Z',
        description: 'holiday',
      };
      const result = await adUpdateJobConfigTool.handler(
        { operation: 'create_calendar_event', job_ids: ['solo-job'], calendar_event: event },
        createContext(ml)
      );
      expect(ml.putCalendar).toHaveBeenCalledWith({
        calendar_id: 'calendar-solo-job',
        job_ids: ['solo-job'],
      });
      const standardResult = result as {
        results: Array<{ type: string; data: { job_id: string; job_ids: string[] } }>;
      };
      expect(standardResult.results[0].data.job_id).toBe('solo-job');
      expect(standardResult.results[0].data.job_ids).toEqual(['solo-job']);
    });

    it('operation=create_calendar_event attaches all job_ids in one call and posts events once', async () => {
      const ml = createMlMock();
      const events = [
        {
          start_time: '2026-09-01T00:00:00Z',
          end_time: '2026-09-16T23:59:59Z',
          description: 'back to school',
        },
        {
          start_time: '2026-11-27T00:00:00Z',
          end_time: '2026-11-27T23:59:59Z',
          description: 'black friday',
        },
      ];
      await adUpdateJobConfigTool.handler(
        {
          operation: 'create_calendar_event',
          job_ids: ['job-a', 'job-b'],
          calendar_id: 'seasonal_sales_events',
          calendar_events: events,
        },
        createContext(ml)
      );
      expect(ml.putCalendar).toHaveBeenCalledWith({
        calendar_id: 'seasonal_sales_events',
        job_ids: ['job-a', 'job-b'],
      });
      expect(ml.postCalendarEvents).toHaveBeenCalledTimes(1);
      expect(ml.postCalendarEvents).toHaveBeenCalledWith({
        calendar_id: 'seasonal_sales_events',
        events,
      });
    });

    it('operation=create_calendar_event associates jobs and skips events that already exist', async () => {
      const ml = createMlMock();
      ml.putCalendar.mockRejectedValue({
        statusCode: 409,
        message: 'resource_already_exists_exception',
      });
      const existingEvent = {
        description: 'holiday',
        start_time: 1704067200000, // 2024-01-01T00:00:00Z
        end_time: 1704153600000, // 2024-01-02T00:00:00Z
      };
      const newEvent = {
        start_time: '2024-02-01T00:00:00Z',
        end_time: '2024-02-02T00:00:00Z',
        description: 'maintenance',
      };
      const duplicateEvent = {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-02T00:00:00Z',
        description: 'holiday',
      };
      ml.getCalendarEvents.mockResolvedValue({ events: [existingEvent] });

      const result = await adUpdateJobConfigTool.handler(
        {
          operation: 'create_calendar_event',
          job_ids: ['job-a', 'job-b'],
          calendar_id: 'holiday-cal',
          calendar_events: [duplicateEvent, newEvent],
        },
        createContext(ml)
      );

      expect(ml.putCalendarJob).toHaveBeenCalledWith({
        calendar_id: 'holiday-cal',
        job_id: 'job-a,job-b',
      });
      expect(ml.postCalendarEvents).toHaveBeenCalledTimes(1);
      expect(ml.postCalendarEvents).toHaveBeenCalledWith({
        calendar_id: 'holiday-cal',
        events: [newEvent],
      });

      const standardResult = result as {
        results: Array<{
          type: string;
          data: {
            events_requested: number;
            events_added: number;
            events_skipped_existing: number;
          };
        }>;
      };
      expect(standardResult.results[0].data.events_requested).toBe(2);
      expect(standardResult.results[0].data.events_added).toBe(1);
      expect(standardResult.results[0].data.events_skipped_existing).toBe(1);
    });

    it('operation=create_calendar_event does not post when all events already exist', async () => {
      const ml = createMlMock();
      ml.putCalendar.mockRejectedValue({ statusCode: 409 });
      const event = {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-02T00:00:00Z',
        description: 'holiday',
      };
      ml.getCalendarEvents.mockResolvedValue({
        events: [
          {
            description: 'holiday',
            start_time: '2024-01-01T00:00:00Z',
            end_time: '2024-01-02T00:00:00Z',
          },
        ],
      });

      await adUpdateJobConfigTool.handler(
        {
          operation: 'create_calendar_event',
          job_id: 'job-b',
          calendar_id: 'holiday-cal',
          calendar_event: event,
        },
        createContext(ml)
      );

      expect(ml.putCalendarJob).toHaveBeenCalledWith({
        calendar_id: 'holiday-cal',
        job_id: 'job-b',
      });
      expect(ml.postCalendarEvents).not.toHaveBeenCalled();
    });

    it('operation=create_calendar_event returns error when job_id and job_ids are missing', async () => {
      const ml = createMlMock();
      const result = await adUpdateJobConfigTool.handler(
        {
          operation: 'create_calendar_event',
          calendar_event: {
            start_time: '2024-01-01T00:00:00Z',
            end_time: '2024-01-02T00:00:00Z',
            description: 'holiday',
          },
        },
        createContext(ml)
      );
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'job_id or job_ids is required for create_calendar_event'
      );
      expect(ml.putCalendar).not.toHaveBeenCalled();
    });

    it('operation=create_calendar_event returns error when job_ids is empty and job_id is missing', async () => {
      const ml = createMlMock();
      const result = await adUpdateJobConfigTool.handler(
        {
          operation: 'create_calendar_event',
          job_ids: [],
          calendar_event: {
            start_time: '2024-01-01T00:00:00Z',
            end_time: '2024-01-02T00:00:00Z',
            description: 'holiday',
          },
        },
        createContext(ml)
      );
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'job_id or job_ids is required for create_calendar_event'
      );
    });

    it('operation=create_calendar_event returns error when events are missing', async () => {
      const ml = createMlMock();
      const result = await adUpdateJobConfigTool.handler(
        { operation: 'create_calendar_event', job_id: 'my-job' },
        createContext(ml)
      );
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'calendar_events (or calendar_event) is required for create_calendar_event'
      );
      expect(ml.putCalendar).not.toHaveBeenCalled();
      expect(ml.postCalendarEvents).not.toHaveBeenCalled();
    });

    it('returns error result when ML client throws', async () => {
      const ml = createMlMock();
      ml.updateJob.mockRejectedValue(new Error('job closed'));
      const result = await adUpdateJobConfigTool.handler(
        { operation: 'update_memory_limit', job_id: 'my-job', memory_limit: '512mb' },
        createContext(ml)
      );
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'Error executing update_memory_limit: job closed'
      );
    });
  });
});
