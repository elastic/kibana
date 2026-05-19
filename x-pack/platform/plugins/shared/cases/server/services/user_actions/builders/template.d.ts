import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class TemplateUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'template'>): UserActionEvent;
}
