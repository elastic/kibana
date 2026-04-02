/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { ProposedSkillDocument } from '../lib/aesop/types';
import { PROPOSED_SKILL_SAVED_OBJECT_TYPE, type ProposedSkillAttributes } from './skill_storage';

const safeParse = (value: string | undefined): any => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export class SkillClient {
  constructor(private readonly soClient: SavedObjectsClientContract) {}

  async create(skill: ProposedSkillDocument): Promise<SavedObject<ProposedSkillAttributes>> {
    const now = new Date().toISOString();
    const attrs = this.toAttributes(skill, now);

    return this.soClient.create<ProposedSkillAttributes>(PROPOSED_SKILL_SAVED_OBJECT_TYPE, attrs, {
      id: skill.id,
    });
  }

  async get(id: string): Promise<SavedObject<ProposedSkillAttributes>> {
    return this.soClient.get<ProposedSkillAttributes>(PROPOSED_SKILL_SAVED_OBJECT_TYPE, id);
  }

  async find(options?: {
    status?: string;
    derivedFrom?: string;
    variantGroupId?: string;
    perPage?: number;
    page?: number;
  }): Promise<SavedObjectsFindResponse<ProposedSkillAttributes>> {
    const filters: string[] = [];

    // Escape double quotes in user-supplied values to prevent KQL injection
    const escapeKql = (value: string): string => value.replace(/"/g, '\\"');

    if (options?.status) {
      filters.push(
        `${PROPOSED_SKILL_SAVED_OBJECT_TYPE}.attributes.validation_status: "${escapeKql(
          options.status
        )}"`
      );
    }
    if (options?.derivedFrom) {
      filters.push(
        `${PROPOSED_SKILL_SAVED_OBJECT_TYPE}.attributes.derived_from: "${escapeKql(
          options.derivedFrom
        )}"`
      );
    }
    if (options?.variantGroupId) {
      filters.push(
        `${PROPOSED_SKILL_SAVED_OBJECT_TYPE}.attributes.variant_group_id: "${escapeKql(
          options.variantGroupId
        )}"`
      );
    }

    return this.soClient.find<ProposedSkillAttributes>({
      type: PROPOSED_SKILL_SAVED_OBJECT_TYPE,
      perPage: options?.perPage ?? 20,
      page: options?.page ?? 1,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
  }

  async update(
    id: string,
    attrs: Partial<ProposedSkillAttributes>
  ): Promise<SavedObject<ProposedSkillAttributes>> {
    await this.soClient.update<ProposedSkillAttributes>(PROPOSED_SKILL_SAVED_OBJECT_TYPE, id, {
      ...attrs,
      updated_at: new Date().toISOString(),
    });
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.soClient.delete(PROPOSED_SKILL_SAVED_OBJECT_TYPE, id);
  }

  toDocument(so: SavedObject<ProposedSkillAttributes>): ProposedSkillDocument {
    const { attributes: a } = so;
    return {
      id: so.id,
      name: a.name,
      description: a.description,
      markdown: a.markdown,
      confidence: a.confidence,
      derived_from: a.derived_from as ProposedSkillDocument['derived_from'],
      variant_group_id: a.variant_group_id,
      variant_label: a.variant_label,
      validation: {
        status: a.validation_status as 'pending' | 'validating' | 'passed' | 'failed',
        final_score: a.validation_final_score,
        composite_score: a.validation_composite_score,
        composite_grade: a.validation_composite_grade,
        started_at: a.validation_started_at,
        completed_at: a.validation_completed_at,
        connector_id: a.validation_connector_id,
        duration_ms: a.validation_duration_ms,
        evaluator_results: safeParse(a.validation_evaluator_results),
        gate_result: safeParse(a.validation_gate_result),
        iterations: safeParse(a.validation_iterations),
        convergence: safeParse(a.validation_convergence),
        error: a.validation_error,
      },
      review: {
        status: a.review_status as 'pending_review' | 'approved' | 'rejected',
        reviewed_by: a.reviewed_by,
        reviewed_at: a.reviewed_at,
        review_notes: a.review_notes,
        rejection_reason: a.rejection_reason,
      },
      deployment: {
        deployed: a.deployed,
        deployed_at: a.deployed_at,
        agent_builder_skill_id: a.agent_builder_skill_id,
      },
      improvement_history: safeParse(a.improvement_history),
      metadata: {
        created_at: a.created_at,
        exploration_execution_id: a.exploration_execution_id,
        source_indices: safeParse(a.source_indices),
      },
    };
  }

  private toAttributes(skill: ProposedSkillDocument, now: string): ProposedSkillAttributes {
    return {
      name: skill.name,
      description: skill.description,
      markdown: skill.markdown,
      confidence: skill.confidence,
      derived_from: skill.derived_from,
      variant_group_id: skill.variant_group_id,
      variant_label: skill.variant_label,

      validation_status: skill.validation?.status ?? 'pending',
      validation_final_score: skill.validation?.final_score,
      validation_composite_score: skill.validation?.composite_score,
      validation_composite_grade: skill.validation?.composite_grade,
      validation_started_at: skill.validation?.started_at,
      validation_completed_at: skill.validation?.completed_at,
      validation_connector_id: skill.validation?.connector_id,
      validation_duration_ms: skill.validation?.duration_ms,
      validation_evaluator_results: skill.validation?.evaluator_results
        ? JSON.stringify(skill.validation.evaluator_results)
        : undefined,
      validation_gate_result: skill.validation?.gate_result
        ? JSON.stringify(skill.validation.gate_result)
        : undefined,
      validation_iterations: skill.validation?.iterations
        ? JSON.stringify(skill.validation.iterations)
        : undefined,
      validation_convergence: skill.validation?.convergence
        ? JSON.stringify(skill.validation.convergence)
        : undefined,
      validation_error: skill.validation?.error,

      review_status: skill.review?.status ?? 'pending_review',
      reviewed_by: skill.review?.reviewed_by,
      reviewed_at: skill.review?.reviewed_at,
      review_notes: skill.review?.review_notes,
      rejection_reason: skill.review?.rejection_reason,

      deployed: skill.deployment?.deployed ?? false,
      deployed_at: skill.deployment?.deployed_at,
      agent_builder_skill_id: skill.deployment?.agent_builder_skill_id,

      improvement_history: skill.improvement_history
        ? JSON.stringify(skill.improvement_history)
        : undefined,

      created_at: skill.metadata?.created_at ?? now,
      updated_at: now,
      exploration_execution_id: skill.metadata?.exploration_execution_id,
      source_indices: skill.metadata?.source_indices
        ? JSON.stringify(skill.metadata.source_indices)
        : undefined,
    };
  }
}
