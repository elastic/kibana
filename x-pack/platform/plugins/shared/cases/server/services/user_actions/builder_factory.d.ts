import type { UserActionType } from '../../../common/types/domain';
import type { UserActionBuilder } from './abstract_builder';
import type { BuilderDeps } from './types';
export declare class BuilderFactory {
    private readonly persistableStateAttachmentTypeRegistry;
    constructor(deps: BuilderDeps);
    getBuilder<T extends UserActionType>(type: T): UserActionBuilder | undefined;
}
