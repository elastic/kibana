/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { decodeSeriesId, InvalidSeriesIdError, type DecodedSeriesId } from '@kbn/alerting-v2-utils';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import {
  getAlertSeriesNotFoundMessage,
  getInvalidSeriesIdMessage,
} from '../../errors/alert_error_messages';
import type { AlertEventRecord } from '../types';

/**
 * Decodes a request's `series_id`, turning a malformed one into the `400
 * INVALID_SERIES_ID` the series routes document. Runs before any I/O.
 */
export const decodeSeriesIdOrThrow = (seriesId: string): DecodedSeriesId => {
  try {
    return decodeSeriesId(seriesId);
  } catch (error) {
    if (error instanceof InvalidSeriesIdError) {
      throw Boom.badRequest(getInvalidSeriesIdMessage(seriesId), {
        code: ALERTING_ERROR_CODES.INVALID_SERIES_ID,
        details: { series_id: seriesId },
      });
    }
    throw error;
  }
};

/**
 * The `404 ALERT_EVENT_NOT_FOUND` of a series that does not exist in the request's space. A series
 * id minted for another space gets the same answer, so it reveals nothing about other spaces.
 */
export const getSeriesNotFoundError = (seriesId: string): Boom.Boom =>
  Boom.notFound(getAlertSeriesNotFoundMessage(seriesId), {
    code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
    details: { series_id: seriesId },
  });

/**
 * The series a stored alert event belongs to, or `null` when the event carries
 * no owner (a rule-backed event without a rule id) and so has no identity.
 */
export const toDecodedSeries = ({
  space_id: spaceId,
  group_hash: groupHash,
  rule_id: ruleId,
  source,
}: AlertEventRecord): DecodedSeriesId | null => {
  if (source && source !== 'internal') {
    return { kind: 'source', space_id: spaceId, source, group_hash: groupHash };
  }

  return ruleId
    ? { kind: 'rule', space_id: spaceId, rule_id: ruleId, group_hash: groupHash }
    : null;
};
