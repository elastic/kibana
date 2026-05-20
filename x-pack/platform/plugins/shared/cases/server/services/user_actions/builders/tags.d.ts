import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class TagsUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'tags'>): UserActionEvent;
}
