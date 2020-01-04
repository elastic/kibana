/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { SavedObjectsFindOptions } from '../../../../../../../src/core/server';
import { UNAUTHENTICATED_USER } from '../../../common/constants';
import {
  ResponseTimeline,
  PageInfoTimeline,
  SortTimeline,
  ResponseFavoriteTimeline,
  TimelineResult,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { Note } from '../note/saved_object';
import { NoteSavedObject } from '../note/types';
import { PinnedEventSavedObject } from '../pinned_event/types';
import { PinnedEvent } from '../pinned_event/saved_object';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';
import { pickSavedTimeline } from './pick_saved_timeline';
import { timelineSavedObjectType } from './saved_object_mappings';
import { SavedTimeline, TimelineSavedObject } from './types';

interface ResponseTimelines {
  timeline: TimelineSavedObject[];
  totalCount: number;
}

export class Timeline {
  private readonly note = new Note();
  private readonly pinnedEvent = new PinnedEvent();

  public async getTimeline(
    request: FrameworkRequest,
    timelineId: string
  ): Promise<TimelineSavedObject> {
    return this.getSavedTimeline(request, timelineId);
  }

  public async getAllTimeline(
    request: FrameworkRequest,
    onlyUserFavorite: boolean | null,
    pageInfo: PageInfoTimeline | null,
    search: string | null,
    sort: SortTimeline | null
  ): Promise<ResponseTimelines> {
    const options: SavedObjectsFindOptions = {
      type: timelineSavedObjectType,
      perPage: pageInfo != null ? pageInfo.pageSize : undefined,
      page: pageInfo != null ? pageInfo.pageIndex : undefined,
      search: search != null ? search : undefined,
      searchFields: onlyUserFavorite
        ? ['title', 'description', 'favorite.keySearch']
        : ['title', 'description'],
      sortField: sort != null ? sort.sortField : undefined,
      sortOrder: sort != null ? sort.sortOrder : undefined,
    };

    return this.getAllSavedTimeline(request, options);
  }

  public async persistFavorite(
    request: FrameworkRequest,
    timelineId: string | null
  ): Promise<ResponseFavoriteTimeline> {
    const userName = request.user?.username ?? UNAUTHENTICATED_USER;
    const fullName = request.user?.full_name ?? '';
    try {
      let timeline: SavedTimeline = {};
      if (timelineId != null) {
        const {
          eventIdToNoteIds,
          notes,
          noteIds,
          pinnedEventIds,
          pinnedEventsSaveObject,
          savedObjectId,
          version,
          ...savedTimeline
        } = await this.getBasicSavedTimeline(request, timelineId);
        timelineId = savedObjectId; // eslint-disable-line no-param-reassign
        timeline = savedTimeline;
      }

      const userFavoriteTimeline = {
        keySearch: userName != null ? convertStringToBase64(userName) : null,
        favoriteDate: new Date().valueOf(),
        fullName,
        userName,
      };
      if (timeline.favorite != null) {
        const alreadyExistsTimelineFavoriteByUser = timeline.favorite.findIndex(
          user => user.userName === userName
        );

        timeline.favorite =
          alreadyExistsTimelineFavoriteByUser > -1
            ? [
                ...timeline.favorite.slice(0, alreadyExistsTimelineFavoriteByUser),
                ...timeline.favorite.slice(alreadyExistsTimelineFavoriteByUser + 1),
              ]
            : [...timeline.favorite, userFavoriteTimeline];
      } else if (timeline.favorite == null) {
        timeline.favorite = [userFavoriteTimeline];
      }

      const persistResponse = await this.persistTimeline(request, timelineId, null, timeline);
      return {
        savedObjectId: persistResponse.timeline.savedObjectId,
        version: persistResponse.timeline.version,
        favorite:
          persistResponse.timeline.favorite != null
            ? persistResponse.timeline.favorite.filter(fav => fav.userName === userName)
            : [],
      };
    } catch (err) {
      if (getOr(null, 'output.statusCode', err) === 403) {
        return {
          savedObjectId: '',
          version: '',
          favorite: [],
          code: 403,
          message: err.message,
        };
      }
      throw err;
    }
  }

  public async persistTimeline(
    request: FrameworkRequest,
    timelineId: string | null,
    version: string | null,
    timeline: SavedTimeline
  ): Promise<ResponseTimeline> {
    const savedObjectsClient = request.context.core.savedObjects.client;

    try {
      if (timelineId == null) {
        // Create new timeline
        return {
          code: 200,
          message: 'success',
          timeline: convertSavedObjectToSavedTimeline(
            await savedObjectsClient.create(
              timelineSavedObjectType,
              pickSavedTimeline(timelineId, timeline, request.user)
            )
          ),
        };
      }
      // Update Timeline
      await savedObjectsClient.update(
        timelineSavedObjectType,
        timelineId,
        pickSavedTimeline(timelineId, timeline, request.user),
        {
          version: version || undefined,
        }
      );
      return {
        code: 200,
        message: 'success',
        timeline: await this.getSavedTimeline(request, timelineId),
      };
    } catch (err) {
      if (timelineId != null && savedObjectsClient.errors.isConflictError(err)) {
        return {
          code: 409,
          message: err.message,
          timeline: await this.getSavedTimeline(request, timelineId),
        };
      } else if (getOr(null, 'output.statusCode', err) === 403) {
        const timelineToReturn: TimelineResult = {
          ...timeline,
          savedObjectId: '',
          version: '',
        };
        return {
          code: 403,
          message: err.message,
          timeline: timelineToReturn,
        };
      }
      throw err;
    }
  }

  public async deleteTimeline(request: FrameworkRequest, timelineIds: string[]) {
    const savedObjectsClient = request.context.core.savedObjects.client;

    await Promise.all(
      timelineIds.map(timelineId =>
        Promise.all([
          savedObjectsClient.delete(timelineSavedObjectType, timelineId),
          this.note.deleteNoteByTimelineId(request, timelineId),
          this.pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
        ])
      )
    );
  }

  private async getBasicSavedTimeline(request: FrameworkRequest, timelineId: string) {
    const savedObjectsClient = request.context.core.savedObjects.client;
    const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);

    return convertSavedObjectToSavedTimeline(savedObject);
  }

  private async getSavedTimeline(request: FrameworkRequest, timelineId: string) {
    const userName = request.user?.username ?? UNAUTHENTICATED_USER;

    const savedObjectsClient = request.context.core.savedObjects.client;
    const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
    const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
    const timelineWithNotesAndPinnedEvents = await Promise.all([
      this.note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
      this.pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
      Promise.resolve(timelineSaveObject),
    ]);

    const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

    return timelineWithReduxProperties(notes, pinnedEvents, timeline, userName);
  }

  private async getAllSavedTimeline(request: FrameworkRequest, options: SavedObjectsFindOptions) {
    const userName = request.user?.username ?? UNAUTHENTICATED_USER;
    const savedObjectsClient = request.context.core.savedObjects.client;
    if (options.searchFields != null && options.searchFields.includes('favorite.keySearch')) {
      options.search = `${options.search != null ? options.search : ''} ${
        userName != null ? convertStringToBase64(userName) : null
      }`;
    }

    const savedObjects = await savedObjectsClient.find(options);

    const timelinesWithNotesAndPinnedEvents = await Promise.all(
      savedObjects.saved_objects.map(async savedObject => {
        const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
        return Promise.all([
          this.note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
          this.pinnedEvent.getAllPinnedEventsByTimelineId(
            request,
            timelineSaveObject.savedObjectId
          ),
          Promise.resolve(timelineSaveObject),
        ]);
      })
    );

    return {
      totalCount: savedObjects.total,
      timeline: timelinesWithNotesAndPinnedEvents.map(([notes, pinnedEvents, timeline]) =>
        timelineWithReduxProperties(notes, pinnedEvents, timeline, userName)
      ),
    };
  }
}

export const convertStringToBase64 = (text: string): string => Buffer.from(text).toString('base64');

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any

const timelineWithReduxProperties = (
  notes: NoteSavedObject[],
  pinnedEvents: PinnedEventSavedObject[],
  timeline: TimelineSavedObject,
  userName: string
): TimelineSavedObject => ({
  ...timeline,
  favorite:
    timeline.favorite != null ? timeline.favorite.filter(fav => fav.userName === userName) : [],
  eventIdToNoteIds: notes.filter(note => note.eventId != null),
  noteIds: notes
    .filter(note => note.eventId == null && note.noteId != null)
    .map(note => note.noteId),
  notes,
  pinnedEventIds: pinnedEvents.map(pinnedEvent => pinnedEvent.eventId),
  pinnedEventsSaveObject: pinnedEvents,
});
