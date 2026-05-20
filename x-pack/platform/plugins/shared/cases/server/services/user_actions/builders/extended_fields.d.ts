import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class ExtendedFieldsUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'extended_fields'>): UserActionEvent;
}
