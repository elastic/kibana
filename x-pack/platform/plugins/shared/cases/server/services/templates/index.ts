/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  ElasticsearchClient,
  ISavedObjectsSerializer,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
} from '@kbn/core/server';
import { toElasticsearchQuery, fromKueryExpression, escapeKuery } from '@kbn/es-query';
import { v4 } from 'uuid';
import { parse as parseYaml } from 'yaml';
import type {
  CreateTemplateInput,
  ParsedTemplate,
  Template,
  UpdateTemplateInput,
} from '../../../common/types/domain/template/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/v1';
import { isRefField } from '../../../common/types/domain/template/fields';
import { toFieldDefinitions, trimFieldDefaults } from './utils';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type {
  TemplatesFindRequest,
  TemplatesFindResponse,
} from '../../../common/types/api/template/v1';

export class TemplatesService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      savedObjectsSerializer: ISavedObjectsSerializer;
      esClient: ElasticsearchClient;
      namespace: string;
      /**
       * Bound, parameterless callback that asks the cases-analytics v2
       * subsystem to recompute and persist this space's runtime field map.
       * Fire-and-forget — never awaited; never throws past this service.
       *
       * Called at the tail of every template create / update / delete. The
       * cases client factory binds this to the current request's space + SO
       * client. When v2 is disabled the bound function is a no-op (see
       * `V2_NOOP_DATA_VIEW_REFRESHER`).
       */
      refreshAnalyticsV2DataView: () => void;
      /**
       * Fetches field-library definitions for the given owner so `$ref` fields
       * can be resolved into the template's cached `fieldDefinitions` summary.
       */
      getFieldDefinitionsForOwner: (owner: string) => Promise<FieldDefinition[]>;
    }
  ) {}

  async getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse> {
    const {
      page,
      perPage,
      sortField = 'name',
      sortOrder = 'asc',
      search,
      tags,
      author,
      owner,
      isDeleted,
      isEnabled,
    } = params;

    const { templates, total } = await this.searchTemplates({
      page,
      perPage,
      sortField,
      sortOrder,
      isDeleted,
      search,
      tags,
      author,
      owner,
      isLatest: true,
      isEnabled,
    });

    const searchLower = search?.toLowerCase() ?? '';

    return {
      templates: templates.map((so) => ({
        ...so.attributes,
        fieldSearchMatches:
          searchLower !== '' &&
          (so.attributes.fieldDefinitions ?? []).some(
            (field) =>
              field.label.toLowerCase().includes(searchLower) ||
              field.name.toLowerCase().includes(searchLower)
          ),
      })),
      page,
      perPage,
      total,
    };
  }

  async getTemplate(
    templateId: string,
    version?: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {}
  ): Promise<SavedObject<Template> | undefined> {
    return this._getTemplate(templateId, version, { includeDeleted });
  }

  /**
   * Fetches ALL template versions (not just isLatest) for extended field filtering in case search.
   *
   * This is critical for extended field filtering because cases may reference
   * older template versions where field definitions have changed. We need to
   * resolve filters against ALL versions to correctly match cases created with
   * historical template versions.
   *
   * Example: If template v1 has "effort estimate" field and v2 renames it to
   * "some estimate", searching for "effort estimate" should only match cases
   * created with v1, not v2. By fetching ALL versions, the filter resolution
   * correctly identifies which template versions have which fields.
   *
   * @param params - Find parameters (owner, isDeleted)
   * @returns Promise resolving to array of all template versions matching the criteria
   *
   * @example
   * // Get all versions of Security Solution templates for extended field search
   * const allVersions = await service.getTemplateVersionsForExtendedFieldSearch({
   *   owner: ['securitySolution'],
   * });
   */
  async getTemplateVersionsForExtendedFieldSearch(params: {
    owner?: string[];
  }): Promise<Array<SavedObject<Template>>> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      owner: params.owner,
      // CRITICAL: Do NOT set isLatest - we want ALL versions
    });

    return templates;
  }

  private async _getTemplate(
    templateId: string,
    version?: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {}
  ): Promise<SavedObject<Template> | undefined> {
    if (version !== undefined) {
      const parsedVersion = parseInt(version, 10);
      if (isNaN(parsedVersion) || version === '') {
        return undefined;
      }
    }

    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 1,
      sortField: 'templateVersion',
      sortOrder: 'desc',
      templateId,
      version,
      ...(version === undefined ? { isLatest: true } : {}),
      ...(includeDeleted ? { isDeleted: true } : {}),
    });

    return templates[0];
  }

  /**
   * Fetches templates from ES using regular search.
   */
  private async searchTemplates({
    page,
    perPage,
    sortField,
    sortOrder,
    isDeleted = false,
    templateId,
    version,
    isLatest,
    search,
    tags,
    author,
    owner,
    isEnabled,
  }: {
    page: number;
    perPage: number;
    sortField: TemplatesFindRequest['sortField'];
    sortOrder: TemplatesFindRequest['sortOrder'];
    isDeleted?: boolean;
    templateId?: string;
    version?: string;
    isLatest?: boolean;
    search?: string;
    tags?: string[];
    author?: string[];
    owner?: string[];
    isEnabled?: boolean;
  }): Promise<{ templates: Array<SavedObject<Template>>; total: number }> {
    interface SearchResult {
      hits: {
        hits: SavedObjectsRawDoc[];
        total: {
          value: number;
        };
      };
    }

    const SO = CASE_TEMPLATE_SAVED_OBJECT;

    const filters = [
      ...(isDeleted ? [] : [toElasticsearchQuery(fromKueryExpression(`NOT ${SO}.deletedAt: *`))]),
      ...(isEnabled !== undefined
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.isEnabled: ${isEnabled}`))]
        : []),
      ...(templateId
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.templateId: "${templateId}"`))]
        : []),
      ...(version
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.templateVersion: "${version}"`))]
        : []),
      ...(isLatest !== undefined
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.isLatest: ${isLatest}`))]
        : []),
      ...(tags && tags.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(tags.map((tag) => `${SO}.tags: "${tag}"`).join(' OR '))
            ),
          ]
        : []),
      ...(author && author.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(author.map((a) => `${SO}.author: "${a}"`).join(' OR '))
            ),
          ]
        : []),
      ...(owner && owner.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(owner.map((o) => `${SO}.owner: "${o}"`).join(' OR '))
            ),
          ]
        : []),
    ];

    const must = search
      ? [
          {
            bool: {
              should: [
                { wildcard: { [`${SO}.name`]: { value: `*${search}*`, case_insensitive: true } } },
                {
                  match_phrase: {
                    [`${SO}.description`]: search,
                  },
                },
                {
                  nested: {
                    path: `${SO}.fieldDefinitions`,
                    query: {
                      bool: {
                        should: [
                          {
                            wildcard: {
                              [`${SO}.fieldDefinitions.name`]: {
                                value: `*${search}*`,
                                case_insensitive: true,
                              },
                            },
                          },
                          {
                            match: {
                              [`${SO}.fieldDefinitions.label`]: search,
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ]
      : [];

    const from = (page - 1) * perPage;

    const sort = [
      {
        [`${CASE_TEMPLATE_SAVED_OBJECT}.${sortField}`]: {
          order: sortOrder,
          missing: '_last',
        },
      },
      ...(sortField === 'templateId'
        ? []
        : [
            {
              [`${CASE_TEMPLATE_SAVED_OBJECT}.templateId`]: {
                order: 'asc' as const,
              },
            },
          ]),
    ];

    const findResult = (await this.dependencies.unsecuredSavedObjectsClient.search({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      namespaces: [this.dependencies.namespace],
      from,
      size: perPage,
      sort,
      query: {
        bool: {
          filter: filters,
          ...(must.length > 0 ? { must } : {}),
        },
      },
    })) as SearchResult;

    return {
      templates: findResult.hits.hits.map((hit) =>
        this.dependencies.savedObjectsSerializer.rawToSavedObject<Template>(hit)
      ),
      total: findResult.hits.total.value,
    };
  }

  async createTemplate(
    input: CreateTemplateInput,
    author: string,
    id: string = v4()
  ): Promise<SavedObject<Template>> {
    const normalizedDefinition = trimFieldDefaults(input.definition);
    // Parse through the zod schema (not a raw `parseYaml` cast) so field-level defaults — e.g. a
    // MARKDOWN field's `type` defaulting to `keyword` — are applied before `toFieldDefinitions`
    // reads them; otherwise an omitted `type` reaches the SO mappings as `undefined` and fails
    // saved-object validation.
    const parsedDefinition = ParsedTemplateDefinitionSchema.parse(parseYaml(normalizedDefinition));
    // The case-default title is optional in the definition, so the identity name must come from
    // `input.name` (the editor always sends it) or, for API back-compat, the definition's title.
    const templateName = input.name ?? parsedDefinition.name;
    if (!templateName) {
      throw Boom.badRequest(
        'A template name is required: provide `name` or a case-default title in the definition.'
      );
    }

    await this.assertTemplateNameIsUnique({
      name: templateName,
      owner: input.owner,
    });

    const libraryDefs = await this.getLibraryDefsIfReferenced(parsedDefinition.fields, input.owner);

    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: normalizedDefinition,
        // Template identity name; falls back to the definition's case-default title when a caller
        // omits it (API back-compat — the route validates the definition first, so `name` exists).
        name: templateName,
        owner: input.owner,
        templateId: v4(),
        description: input.description,
        tags: input.tags,
        author,
        fieldCount: parsedDefinition.fields.length,
        fieldDefinitions: toFieldDefinitions(parsedDefinition.fields, libraryDefs),
        isEnabled: input.isEnabled ?? true,
      } as Template,
      { refresh: true, id }
    );

    // Tell cases-analytics v2 to recompute the per-space runtime field map.
    // Fire-and-forget; failures are caught + logged inside the v2 service.
    this.dependencies.refreshAnalyticsV2DataView();

    return templateSavedObject;
  }

  async updateTemplate(
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<SavedObject<Template>> {
    const currentTemplate = await this._getTemplate(templateId);

    if (!currentTemplate) {
      throw Boom.notFound(`Template with id ${templateId} not found`);
    }

    const normalizedDefinition = trimFieldDefaults(input.definition);
    // See createTemplate: parse through the zod schema so field-level defaults are applied.
    const parsedDefinition = ParsedTemplateDefinitionSchema.parse(parseYaml(normalizedDefinition));
    // See createTemplate: identity name comes from `input.name` or the definition's (optional) title.
    const templateName = input.name ?? parsedDefinition.name;
    if (!templateName) {
      throw Boom.badRequest(
        'A template name is required: provide `name` or a case-default title in the definition.'
      );
    }

    await this.assertTemplateNameIsUnique({
      name: templateName,
      owner: input.owner,
      excludeTemplateId: currentTemplate.attributes.templateId,
    });

    const libraryDefs = await this.getLibraryDefsIfReferenced(parsedDefinition.fields, input.owner);

    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: currentTemplate.attributes.templateVersion + 1,
        isLatest: true,
        definition: normalizedDefinition,
        // See createTemplate: PUT may omit the identity name; fall back to the case-default title.
        // (PATCH resolves `name` to the existing value in its route before reaching here.)
        name: templateName,
        owner: input.owner,
        templateId: currentTemplate.attributes.templateId,
        deletedAt: null,
        description: input.description,
        tags: input.tags,
        author: currentTemplate.attributes.author,
        fieldCount: parsedDefinition.fields.length,
        fieldDefinitions: toFieldDefinitions(parsedDefinition.fields, libraryDefs),
        usageCount: currentTemplate.attributes.usageCount,
        lastUsedAt: currentTemplate.attributes.lastUsedAt,
        isEnabled: input.isEnabled ?? currentTemplate.attributes.isEnabled ?? true,
        // Carry the v1 lineage forward across edits/version bumps. The bridges read only the
        // `isLatest` version, so dropping this here would silently degrade a migrated template to
        // name-only resolution on the first edit (losing duplicate-name disambiguation, and breaking
        // entirely on rename).
        legacyKey: currentTemplate.attributes.legacyKey,
      } as Template,
      {
        refresh: true,
      }
    );

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      [
        {
          id: currentTemplate.id,
          type: CASE_TEMPLATE_SAVED_OBJECT,
          attributes: {
            isLatest: false,
          },
        },
      ],
      { refresh: true }
    );

    // Update may shift `fieldDefinitions` (different field set, renamed fields,
    // changed types). Tell v2 to refresh.
    this.dependencies.refreshAnalyticsV2DataView();

    return templateSavedObject;
  }

  /**
   * Returns all unique tags from the latest version of each non-deleted template.
   */
  async getTags(): Promise<string[]> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      isLatest: true,
    });
    const tags = templates.flatMap((so) => so.attributes.tags ?? []).filter(Boolean);
    return [...new Set(tags)].sort();
  }

  /**
   * Returns all unique authors from the latest version of each non-deleted template.
   */
  async getAuthors(): Promise<string[]> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      isLatest: true,
    });
    const authors = templates
      .map((so) => so.attributes.author)
      .filter((a): a is string => Boolean(a));
    return [...new Set(authors)].sort();
  }

  async incrementUsageStats(templateId: string): Promise<void> {
    const template = await this._getTemplate(templateId);

    if (!template) {
      return;
    }

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      [
        {
          id: template.id,
          type: CASE_TEMPLATE_SAVED_OBJECT,
          attributes: {
            usageCount: (template.attributes.usageCount ?? 0) + 1,
            lastUsedAt: new Date().toISOString(),
          },
        },
      ],
      { refresh: false }
    );
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const latestTemplate = await this._getTemplate(templateId);

    if (!latestTemplate) {
      return;
    }

    const templateSnapshots = await this.dependencies.unsecuredSavedObjectsClient.find({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      filter: fromKueryExpression(
        `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateId: "${templateId}"`
      ),
      perPage: 10000,
      page: 1,
    });

    const ids = templateSnapshots.saved_objects.map((so) => so.id);

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      ids.map((id) => ({
        id,
        type: CASE_TEMPLATE_SAVED_OBJECT,
        attributes: {
          deletedAt: new Date().toISOString(),
        },
      })),
      { refresh: true }
    );

    // Refresh the per-space runtime field map even on soft-delete: keeps
    // the propagation hook wired so future changes to the template field
    // collection reach the data view without a code change.
    this.dependencies.refreshAnalyticsV2DataView();
  }

  /**
   * Fetches the owner's field library only when the definition actually has `$ref` fields to
   * resolve — avoids an unnecessary SO `find` round-trip on every create/update for templates
   * that only use inline fields.
   */
  private async getLibraryDefsIfReferenced(
    fields: ParsedTemplate['definition']['fields'],
    owner: string
  ): Promise<FieldDefinition[]> {
    if (!fields.some(isRefField)) {
      return [];
    }

    return this.dependencies.getFieldDefinitionsForOwner(owner);
  }

  /**
   * Enforces that a template's identity `name` is unique per owner within the space, comparing
   * case-insensitively against the latest, non-deleted version of every other template. The
   * case-default title inside the YAML definition is intentionally NOT constrained here — only the
   * template's metadata name.
   *
   * NOTE: This is a best-effort read-then-write check, not an atomic constraint. Saved objects have
   * no unique index on `name`, so two concurrent creates/renames racing on the same name can both
   * pass this check and persist. That is an accepted trade-off: template create/rename is a
   * low-frequency administrative action, and the check reads the latest committed state (`refresh`
   * writes are used on create/update), so the practical collision window is small. Enforcing true
   * atomicity would require a dedicated uniqueness SO or an alias/lock, which is out of scope here.
   */
  private async assertTemplateNameIsUnique({
    name,
    owner,
    excludeTemplateId,
  }: {
    name: string;
    owner: string;
    excludeTemplateId?: string;
  }): Promise<void> {
    const escapedOwner = escapeKuery(owner);
    const soType = CASE_TEMPLATE_SAVED_OBJECT;
    const latestTemplatesForOwner =
      await this.dependencies.unsecuredSavedObjectsClient.find<Template>({
        type: soType,
        namespaces: [this.dependencies.namespace],
        page: 1,
        perPage: 10000,
        sortField: 'name',
        sortOrder: 'asc',
        // Only the identity name is needed for the comparison — avoid loading full YAML definitions.
        fields: ['name', 'templateId', 'owner', 'isLatest', 'deletedAt'],
        filter: fromKueryExpression(
          `${soType}.attributes.owner: "${escapedOwner}" AND ` +
            `${soType}.attributes.isLatest: true AND NOT ${soType}.attributes.deletedAt: *`
        ),
      });

    const normalizedRequestedName = name.trim().toLocaleLowerCase();
    const hasNameConflict = latestTemplatesForOwner.saved_objects.some((template) => {
      if (excludeTemplateId !== undefined && template.attributes.templateId === excludeTemplateId) {
        return false;
      }

      return template.attributes.name.trim().toLocaleLowerCase() === normalizedRequestedName;
    });

    if (hasNameConflict) {
      throw Boom.conflict(`Template name "${name}" already exists for owner "${owner}"`);
    }
  }
}
