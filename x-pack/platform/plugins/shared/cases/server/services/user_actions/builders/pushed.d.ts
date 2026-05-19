import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class PushedUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'pushed'>): UserActionEvent;
}
