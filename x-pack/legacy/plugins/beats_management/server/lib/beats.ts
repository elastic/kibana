/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import moment from 'moment';
import { CMBeat } from '../../common/domain_types';
import {
  BeatsRemovalReturn,
  BeatsTagAssignment,
  CMAssignmentReturn,
  CMBeatsAdapter,
} from './adapters/beats/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { BeatEnrollmentStatus, CMServerLibs, UserOrToken } from './types';

export class CMBeatsDomain {
  private tags: CMServerLibs['tags'];
  private tokens: CMServerLibs['tokens'];
  private framework: CMServerLibs['framework'];

  constructor(
    private readonly adapter: CMBeatsAdapter,
    libs: {
      tags: CMServerLibs['tags'];
      tokens: CMServerLibs['tokens'];
      framework: CMServerLibs['framework'];
    }
  ) {
    this.adapter = adapter;
    this.tags = libs.tags;
    this.tokens = libs.tokens;
    this.framework = libs.framework;
  }

  public async getById(user: FrameworkUser, beatId: string): Promise<CMBeat | null> {
    const beat = await this.adapter.get(user, beatId);
    return beat && beat.active ? beat : null;
  }

  public async getByIds(user: FrameworkUser, beatIds: string[]): Promise<CMBeat[]> {
    const beats = await this.adapter.getWithIds(user, beatIds);
    return beats.filter((beat) => beat.active);
  }

  public async getAll(user: FrameworkUser, ESQuery?: any) {
    return (await this.adapter.getAll(user, ESQuery)).filter(
      (beat: CMBeat) => beat.active === true
    );
  }

  public async getAllWithTag(user: FrameworkUser, tagId: string) {
    return (await this.adapter.getAllWithTags(user, [tagId])).filter(
      (beat: CMBeat) => beat.active === true
    );
  }

  public async getByEnrollmentToken(user: FrameworkUser, enrollmentToken: string) {
    const beat = await this.adapter.getBeatWithToken(user, enrollmentToken);
    return beat && beat.active ? beat : null;
  }

  public async update(userOrToken: UserOrToken, beatId: string, beatData: Partial<CMBeat>) {
    const beat = await this.adapter.get(this.framework.internalUser, beatId);

    // FIXME make return type enum
    if (beat === null) {
      return 'beat-not-found';
    }

    if (typeof userOrToken === 'string') {
      const { verified: isAccessTokenValid } = this.tokens.verifyToken(
        beat ? beat.access_token : '',
        userOrToken
      );
      if (!isAccessTokenValid) {
        return 'invalid-access-token';
      }
    }

    const user = typeof userOrToken === 'string' ? this.framework.internalUser : userOrToken;
    await this.adapter.update(user, {
      ...beat,
      ...beatData,
    });
  }

  public async enrollBeat(
    enrollmentToken: string,
    beatId: string,
    remoteAddress: string,
    beat: Partial<CMBeat>
  ): Promise<{ status: string; accessToken?: string }> {
    const { token, expires_on } = await this.tokens.getEnrollmentToken(enrollmentToken);
    // eslint-disable-next-line @typescript-eslint/camelcase
    if (expires_on && moment(expires_on).isBefore(moment())) {
      return { status: BeatEnrollmentStatus.ExpiredEnrollmentToken };
    }
    if (!token) {
      return { status: BeatEnrollmentStatus.InvalidEnrollmentToken };
    }

    const existingBeat = await this.getById(this.framework.internalUser, beatId);
    if (existingBeat) {
      return { status: BeatEnrollmentStatus.Success };
    }

    const accessToken = this.tokens.generateAccessToken();
    const verifiedOn = moment().toJSON();

    await this.adapter.insert(this.framework.internalUser, {
      tags: [],
      ...beat,
      active: true,
      enrollment_token: enrollmentToken,
      verified_on: verifiedOn,
      access_token: accessToken,
      host_ip: remoteAddress,
      id: beatId,
    } as CMBeat);

    await this.tokens.deleteEnrollmentToken(enrollmentToken);

    return { status: BeatEnrollmentStatus.Success, accessToken };
  }

  public async removeTagsFromBeats(
    user: FrameworkUser,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsRemovalReturn> {
    const beatIds = uniq(removals.map((removal) => removal.beatId));
    const tagIds = uniq(removals.map((removal) => removal.tag));

    const response = {
      removals: removals.map(() => ({ status: null })),
    };

    const beats = await this.adapter.getWithIds(user, beatIds);
    const tags = await this.tags.getWithIds(user, tagIds);

    // Handle assignments containing non-existing beat IDs or tags
    const nonExistentBeatIds = findNonExistentItems(beats, beatIds);
    const nonExistentTags = await findNonExistentItems(tags, tagIds);

    addNonExistentItemToResponse(
      response,
      removals,
      nonExistentBeatIds,
      nonExistentTags,
      'removals'
    );

    // FIXME abstract this
    const validRemovals = removals
      .map((removal, idxInRequest) => ({
        beatId: removal.beatId,
        idxInRequest, // so we can add the result of this removal to the correct place in the response
        tag: removal.tag,
      }))
      .filter((removal, idx) => response.removals[idx].status === null);

    if (validRemovals.length > 0) {
      const removalResults = await this.adapter.removeTagsFromBeats(user, validRemovals);
      return addToResultsToResponse('removals', response, removalResults);
    }
    return response;
  }

  public async assignTagsToBeats(
    user: FrameworkUser,
    assignments: BeatsTagAssignment[]
  ): Promise<CMAssignmentReturn> {
    const beatIds = uniq(assignments.map((assignment) => assignment.beatId));
    const tagIds = uniq(assignments.map((assignment) => assignment.tag));

    const response = {
      assignments: assignments.map(() => ({ status: null })),
    };
    const beats = await this.adapter.getWithIds(user, beatIds);
    const tags = await this.tags.getWithIds(user, tagIds);
    // Handle assignments containing non-existing beat IDs or tags
    const nonExistentBeatIds = findNonExistentItems(beats, beatIds);
    const nonExistentTags = findNonExistentItems(tags, tagIds);

    // FIXME break out back into route / function response
    // FIXME causes function to error if a beat or tag does not exist
    addNonExistentItemToResponse(
      response,
      assignments,
      nonExistentBeatIds,
      nonExistentTags,
      'assignments'
    );

    // FIXME abstract this
    const validAssignments = assignments
      .map((assignment, idxInRequest) => ({
        beatId: assignment.beatId,
        idxInRequest, // so we can add the result of this assignment to the correct place in the response
        tag: assignment.tag,
      }))
      .filter((assignment, idx) => response.assignments[idx].status === null);

    if (validAssignments.length > 0) {
      const assignmentResults = await this.adapter.assignTagsToBeats(user, validAssignments);

      // TODO This should prob not mutate
      return addToResultsToResponse('assignments', response, assignmentResults);
    }
    return response;
  }
}

// FIXME abstract to the route, also the key arg is a temp fix
function addNonExistentItemToResponse(
  response: any,
  assignments: any,
  nonExistentBeatIds: any,
  nonExistentTags: any,
  key: string
) {
  assignments.forEach(({ beatId, tag }: BeatsTagAssignment, idx: any) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(beatId);

    const isTagNonExistent = nonExistentTags.includes(tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Beat ${beatId} and tag ${tag} not found`;
    } else if (isBeatNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Beat ${beatId} not found`;
    } else if (isTagNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Tag ${tag} not found`;
    }
  });
}

// TODO dont mutate response
function addToResultsToResponse(key: string, response: any, assignmentResults: any) {
  assignmentResults.forEach((assignmentResult: any) => {
    const { idxInRequest, status, result } = assignmentResult;
    response[key][idxInRequest].status = status;
    response[key][idxInRequest].result = result;
  });
  return response;
}

export function findNonExistentItems(items: Array<{ id: string }>, requestedItems: string[]) {
  return requestedItems.reduce((nonExistentItems: string[], requestedItem: string, idx: number) => {
    if (items.findIndex((item) => item && item.id === requestedItem) === -1) {
      nonExistentItems.push(requestedItems[idx]);
    }
    return nonExistentItems;
  }, []);
}
