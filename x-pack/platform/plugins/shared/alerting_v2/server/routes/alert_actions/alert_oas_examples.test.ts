/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkCreateEpisodeAlertActionBodySchema,
  bulkCreateSeriesAlertActionBodySchema,
  bulkResponseSchema,
  createAckEpisodeActionBodySchema,
  createActivateEpisodeActionBodySchema,
  createAssignEpisodeActionBodySchema,
  createDeactivateEpisodeActionBodySchema,
  createSnoozeSeriesActionBodySchema,
  createTagSeriesActionBodySchema,
  createUnackEpisodeActionBodySchema,
  createUnsnoozeSeriesActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import {
  BULK_CREATE_SERIES_ACTION_REQUEST,
  BULK_CREATE_SERIES_ACTION_RESPONSE,
} from './series/bulk_create_series_action_oas_example';
import { CREATE_TAG_SERIES_ACTION_REQUEST } from './series/create_tag_series_action_oas_example';
import { CREATE_SNOOZE_SERIES_ACTION_REQUEST } from './series/create_snooze_series_action_oas_example';
import { CREATE_UNSNOOZE_SERIES_ACTION_REQUEST } from './series/create_unsnooze_series_action_oas_example';
import {
  BULK_CREATE_EPISODE_ACTION_REQUEST,
  BULK_CREATE_EPISODE_ACTION_RESPONSE,
} from './episodes/bulk_create_episode_action_oas_example';
import { CREATE_ACK_EPISODE_ACTION_REQUEST } from './episodes/create_ack_episode_action_oas_example';
import { CREATE_UNACK_EPISODE_ACTION_REQUEST } from './episodes/create_unack_episode_action_oas_example';
import { CREATE_ASSIGN_EPISODE_ACTION_REQUEST } from './episodes/create_assign_episode_action_oas_example';
import { CREATE_ACTIVATE_EPISODE_ACTION_REQUEST } from './episodes/create_activate_episode_action_oas_example';
import { CREATE_DEACTIVATE_EPISODE_ACTION_REQUEST } from './episodes/create_deactivate_episode_action_oas_example';

describe('alert action OAS example payloads', () => {
  it('keeps tag request example valid against createTagSeriesActionBodySchema', () => {
    expect(
      createTagSeriesActionBodySchema.safeParse(CREATE_TAG_SERIES_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps snooze request example valid against createSnoozeSeriesActionBodySchema', () => {
    expect(
      createSnoozeSeriesActionBodySchema.safeParse(CREATE_SNOOZE_SERIES_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps unsnooze request example valid against createUnsnoozeSeriesActionBodySchema', () => {
    expect(
      createUnsnoozeSeriesActionBodySchema.safeParse(CREATE_UNSNOOZE_SERIES_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps ack request example valid against createAckEpisodeActionBodySchema', () => {
    expect(
      createAckEpisodeActionBodySchema.safeParse(CREATE_ACK_EPISODE_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps unack request example valid against createUnackEpisodeActionBodySchema', () => {
    expect(
      createUnackEpisodeActionBodySchema.safeParse(CREATE_UNACK_EPISODE_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps assign request example valid against createAssignEpisodeActionBodySchema', () => {
    expect(
      createAssignEpisodeActionBodySchema.safeParse(CREATE_ASSIGN_EPISODE_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps activate request example valid against createActivateEpisodeActionBodySchema', () => {
    expect(
      createActivateEpisodeActionBodySchema.safeParse(CREATE_ACTIVATE_EPISODE_ACTION_REQUEST)
        .success
    ).toBe(true);
  });

  it('keeps deactivate request example valid against createDeactivateEpisodeActionBodySchema', () => {
    expect(
      createDeactivateEpisodeActionBodySchema.safeParse(CREATE_DEACTIVATE_EPISODE_ACTION_REQUEST)
        .success
    ).toBe(true);
  });

  it('keeps series bulk request example valid against bulkCreateSeriesAlertActionBodySchema', () => {
    expect(
      bulkCreateSeriesAlertActionBodySchema.safeParse(BULK_CREATE_SERIES_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps series bulk response example valid against bulkResponseSchema', () => {
    expect(bulkResponseSchema.safeParse(BULK_CREATE_SERIES_ACTION_RESPONSE).success).toBe(true);
  });

  it('keeps episode bulk request example valid against bulkCreateEpisodeAlertActionBodySchema', () => {
    expect(
      bulkCreateEpisodeAlertActionBodySchema.safeParse(BULK_CREATE_EPISODE_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps episode bulk response example valid against bulkResponseSchema', () => {
    expect(bulkResponseSchema.safeParse(BULK_CREATE_EPISODE_ACTION_RESPONSE).success).toBe(true);
  });
});
