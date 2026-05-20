import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class CustomFieldsUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'customFields'>): UserActionEvent;
}
