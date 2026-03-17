/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  ListSkillsResponse,
  GetSkillResponse,
  DeleteSkillResponse,
  CreateSkillPayload,
  UpdateSkillPayload,
  CreateSkillResponse,
  UpdateSkillResponse,
} from '../../../common/http_api/skills';
import { publicApiPath } from '../../../common/constants';

export class SkillsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list() {
    const { results } = await this.http.get<ListSkillsResponse>(`${publicApiPath}/skills`, {});
    return results;
  }

  async get({ skillId }: { skillId: string }) {
    return await this.http.get<GetSkillResponse>(`${publicApiPath}/skills/${skillId}`, {});
  }

  async delete({ skillId }: { skillId: string }) {
    return await this.http.delete<DeleteSkillResponse>(`${publicApiPath}/skills/${skillId}`, {});
  }

  async create(skill: CreateSkillPayload) {
    return await this.http.post<CreateSkillResponse>(`${publicApiPath}/skills`, {
      body: JSON.stringify(skill),
    });
  }

  async update({ skillId, ...update }: UpdateSkillPayload & { skillId: string }) {
    return await this.http.put<UpdateSkillResponse>(`${publicApiPath}/skills/${skillId}`, {
      body: JSON.stringify(update),
    });
  }
}
