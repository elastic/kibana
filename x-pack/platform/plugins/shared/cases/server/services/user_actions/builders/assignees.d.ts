import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class AssigneesUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'assignees'>): UserActionEvent;
}
