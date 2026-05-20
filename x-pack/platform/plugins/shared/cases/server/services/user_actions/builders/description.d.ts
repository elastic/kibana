import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class DescriptionUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'description'>): UserActionEvent;
}
