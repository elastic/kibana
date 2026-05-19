import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class ObservablesUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'observables'>): UserActionEvent;
}
