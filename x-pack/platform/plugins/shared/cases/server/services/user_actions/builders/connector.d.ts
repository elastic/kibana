import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class ConnectorUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'connector'>): UserActionEvent;
}
