import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class SettingsUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'settings'>): UserActionEvent;
}
