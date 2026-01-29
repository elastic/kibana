/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  EntityRecognitionConfig,
} from '@kbn/agent-builder-server/attachments';

/**
 * Extension to an existing attachment type.
 * Solutions can use this to add their own skills, tools, and content
 * to attachment types registered by the platform.
 */
export interface AttachmentTypeExtension {
  /**
   * Additional skills to reference (merged with base definition).
   */
  skills?: string[];

  /**
   * Additional tool IDs to expose (merged with base definition's getTools).
   */
  tools?: string[];

  /**
   * Additional skill content (appended to base definition).
   */
  skillContent?: string;

  /**
   * Additional entity recognition patterns (merged with base definition).
   */
  entityRecognition?: Partial<EntityRecognitionConfig>;
}

/**
 * Merged attachment type definition with all extensions applied.
 */
export type MergedAttachmentTypeDefinition = AttachmentTypeDefinition & {
  /**
   * All skills from base + extensions (deduplicated).
   */
  mergedSkills: string[];

  /**
   * All tools from base + extensions (deduplicated).
   */
  mergedTools: string[];

  /**
   * Combined skill content from base + extensions.
   */
  mergedSkillContent: string;

  /**
   * All entity recognition patterns from base + extensions.
   */
  mergedEntityPatterns: RegExp[];
};

export interface AttachmentTypeRegistry {
  /**
   * Register a new attachment type (platform use).
   */
  register(attachmentType: AttachmentTypeDefinition): void;

  /**
   * Extend an existing attachment type (solution use).
   * Extensions are merged with the base definition at runtime.
   */
  extend(attachmentTypeId: string, extension: AttachmentTypeExtension): void;

  /**
   * Check if an attachment type is registered.
   */
  has(attachmentTypeId: string): boolean;

  /**
   * Get the base attachment type definition (without extensions).
   */
  get(attachmentTypeId: string): AttachmentTypeDefinition | undefined;

  /**
   * Get the merged attachment type definition (with all extensions applied).
   */
  getMerged(attachmentTypeId: string): MergedAttachmentTypeDefinition | undefined;

  /**
   * List all registered attachment types (base definitions).
   */
  list(): AttachmentTypeDefinition[];

  /**
   * List all registered attachment types with extensions merged.
   */
  listMerged(): MergedAttachmentTypeDefinition[];
}

export const createAttachmentTypeRegistry = (): AttachmentTypeRegistry => {
  return new AttachmentTypeRegistryImpl();
};

class AttachmentTypeRegistryImpl implements AttachmentTypeRegistry {
  private attachmentTypes: Map<string, AttachmentTypeDefinition> = new Map();
  private extensions: Map<string, AttachmentTypeExtension[]> = new Map();

  constructor() { }

  register(type: AttachmentTypeDefinition) {
    if (this.attachmentTypes.has(type.id)) {
      throw new Error(`Attachment type with id ${type.id} already registered`);
    }
    this.attachmentTypes.set(type.id, type);
  }

  extend(attachmentTypeId: string, extension: AttachmentTypeExtension) {
    const existing = this.extensions.get(attachmentTypeId) ?? [];
    existing.push(extension);
    this.extensions.set(attachmentTypeId, existing);
  }

  has(typeId: string): boolean {
    return this.attachmentTypes.has(typeId);
  }

  get(typeId: string) {
    return this.attachmentTypes.get(typeId);
  }

  getMerged(typeId: string): MergedAttachmentTypeDefinition | undefined {
    const base = this.attachmentTypes.get(typeId);
    if (!base) {
      return undefined;
    }
    return this.mergeExtensions(base);
  }

  list() {
    return [...this.attachmentTypes.values()];
  }

  listMerged(): MergedAttachmentTypeDefinition[] {
    return [...this.attachmentTypes.values()].map((type) => this.mergeExtensions(type));
  }

  private mergeExtensions(base: AttachmentTypeDefinition): MergedAttachmentTypeDefinition {
    const typeExtensions = this.extensions.get(base.id) ?? [];

    // Merge skills (deduplicated)
    const mergedSkills = [...new Set([
      ...(base.skills ?? []),
      ...typeExtensions.flatMap((ext) => ext.skills ?? []),
    ])];

    // Merge tools (deduplicated) - combine getTools() result with extension tools
    const baseTools = base.getTools?.() ?? [];
    const mergedTools = [...new Set([
      ...baseTools,
      ...typeExtensions.flatMap((ext) => ext.tools ?? []),
    ])];

    // Concatenate skill content with section separators
    const skillContentParts = [base.skillContent, ...typeExtensions.map((ext) => ext.skillContent)]
      .filter((content): content is string => Boolean(content));
    const mergedSkillContent = skillContentParts.join('\n\n---\n\n');

    // Merge entity recognition patterns
    const basePatterns = base.entityRecognition?.patterns ?? [];
    const extensionPatterns = typeExtensions
      .flatMap((ext) => ext.entityRecognition?.patterns ?? []);
    const mergedEntityPatterns = [...basePatterns, ...extensionPatterns];

    return {
      ...base,
      mergedSkills,
      mergedTools,
      mergedSkillContent,
      mergedEntityPatterns,
    };
  }
}
