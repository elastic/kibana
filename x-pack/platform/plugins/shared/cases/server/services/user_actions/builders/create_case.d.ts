import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class CreateCaseUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'create_case'>): UserActionEvent;
}
