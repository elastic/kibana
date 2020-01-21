/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { SavedObjectsFindOptions } from '../../../../../../../src/core/server';
import { CaseSavedObject, CasesSavedObjects, PageInfoCase, SortCase } from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { caseSavedObjectType } from './saved_object_mappings';

export class Case {
  public async deleteCase(request: FrameworkRequest, noteIds: string[]) {
    const savedObjectsClient = request.context.core.savedObjects.client;

    await Promise.all(
      noteIds.map(noteId => savedObjectsClient.delete(caseSavedObjectType, noteId))
    );
  }

  public async getCase(request: FrameworkRequest, caseId: string): Promise<CaseSavedObject> {
    return this.getSavedCase(request, caseId);
  }

  public async getCases(
    request: FrameworkRequest,
    pageInfo: PageInfoCase | null,
    search: string | null,
    sort: SortCase | null
  ): Promise<CasesSavedObjects> {
    const options: SavedObjectsFindOptions = {
      type: caseSavedObjectType,
      perPage: pageInfo != null ? pageInfo.pageSize : undefined,
      page: pageInfo != null ? pageInfo.pageIndex + 1 : undefined, // + 1 because table pagination starts at 0 and saved object page index starts at 1
      search: search != null ? search : undefined,
      searchFields: ['tags'],
      sortField: sort != null ? sort.field : undefined,
      sortOrder: sort != null ? sort.direction : undefined,
    };

    return this.getAllSavedCase(request, options);
  }

  private async getSavedCase(request: FrameworkRequest, caseId: string) {
    const savedObjectsClient = request.context.core.savedObjects.client;
    const savedObject = await savedObjectsClient.get(caseSavedObjectType, caseId);
    //
    //   'SAVED CASE!!!',
    //   JSON.stringify({
    //     caseSavedObjectType,
    //     caseId,
    //     savedObject,
    //   })
    // );

    return convertSavedObjectToSavedCase(savedObject);
  }

  private async getAllSavedCase(request: FrameworkRequest, options: SavedObjectsFindOptions) {
    // const savedObjectsClient = request.context.core.savedObjects.client;
    console.log('saved objects find options', options);
    let response;
    try {
      response = await axios.get('/api/cases', {
        params: options,
      });
      console.log(response);
    } catch (error) {
      console.error(error);
      return error;
    }
    const { data }: { data: CasesSavedObjects } = response; // await savedObjectsClient.find(options);
    return {
      ...data,
      saved_objects: data.saved_objects.map(savedObject =>
        convertSavedObjectToSavedCase(savedObject)
      ),
    };
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertSavedObjectToSavedCase = (savedObject: any): any => savedObject;

//   (
//   savedObject: unknown,
//   timelineVersion?: string | undefined | null
// ): CaseSavedObject =>
//   pipe(
//     CaseSavedObjectRuntimeType.decode(savedObject),
//     map(savedCase => ({
//       noteId: savedCase.id,
//       version: savedCase.version,
//       timelineVersion,
//       ...savedCase.attributes,
//     })),
//     fold(errors => {
//       throw new Error(failure(errors).join('\n'));
//     }, identity)
//   );

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any
//
// const pickSavedCase = (
//   noteId: string | null,
//   savedCase: SavedCase,
//   userInfo: AuthenticatedUser | null
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
// ): any => {
//   if (noteId == null) {
//     savedCase.created = new Date().valueOf();
//     savedCase.createdBy = userInfo?.username ?? UNAUTHENTICATED_USER;
//     savedCase.updated = new Date().valueOf();
//     savedCase.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
//   } else if (noteId != null) {
//     savedCase.updated = new Date().valueOf();
//     savedCase.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
//   }
//   return savedCase;
// };
