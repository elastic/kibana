/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { throwErrors } from '../../../../../../plugins/case/common/api';
import {
  SavedTimeline,
  TimelineResponse,
  TimelineResponseType,
} from '../../../../../../plugins/siem/common/types/timeline';
import { TIMELINE_URL } from '../../../../../../plugins/siem/common/constants';

import { KibanaServices } from '../../lib/kibana';
import { createToasterPlainError } from '../case/utils';

interface RequestPostTimeline {
  timeline: SavedTimeline;
  signal?: AbortSignal;
}

interface RequestPatchTimeline<T = string> extends RequestPostTimeline {
  timelineId: T;
  version: T;
}

type RequestPersistTimeline = RequestPostTimeline & Partial<RequestPatchTimeline<null | string>>;

const decodeTimelineResponse = (respTimeline?: TimelineResponse) =>
  pipe(
    TimelineResponseType.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const postTimeline = async ({ timeline }: RequestPostTimeline): Promise<TimelineResponse> => {
  const response = await KibanaServices.get().http.fetch<TimelineResponse>(TIMELINE_URL, {
    method: 'POST',
    body: JSON.stringify(timeline),
    // signal,
  });
  return decodeTimelineResponse(response);
};

const patchTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPatchTimeline): Promise<TimelineResponse> => {
  const response = await KibanaServices.get().http.fetch<TimelineResponse>(TIMELINE_URL, {
    method: 'PATCH',
    body: JSON.stringify({ timeline, timelineId, version }),
    // signal,
  });
  return decodeTimelineResponse(response);
};

export const persistTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPersistTimeline): Promise<TimelineResponse> => {
  if (timelineId == null) {
    return postTimeline({ timeline });
  }
  return patchTimeline({
    timelineId,
    timeline,
    version: version ?? '',
  });
};
