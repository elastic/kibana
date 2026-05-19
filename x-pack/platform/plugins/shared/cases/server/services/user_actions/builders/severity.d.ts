import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class SeverityUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'severity'>): UserActionEvent;
}
