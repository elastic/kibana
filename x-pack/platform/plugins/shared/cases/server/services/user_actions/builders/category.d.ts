import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class CategoryUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'category'>): UserActionEvent;
}
