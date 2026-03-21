import type { PersistedSkillCreateRequest, PersistedSkillUpdateRequest } from '@kbn/agent-builder-common';
import type { SkillProperties } from './storage';
import type { SkillDocument, SkillPersistedDefinition } from './types';
export declare const fromEs: (document: SkillDocument) => SkillPersistedDefinition;
export declare const createAttributes: ({ createRequest, space, creationDate, }: {
    createRequest: PersistedSkillCreateRequest;
    space: string;
    creationDate?: Date;
}) => SkillProperties;
export declare const updateDocument: ({ current, update, updateDate, }: {
    current: SkillProperties;
    update: PersistedSkillUpdateRequest;
    updateDate?: Date;
}) => SkillProperties;
