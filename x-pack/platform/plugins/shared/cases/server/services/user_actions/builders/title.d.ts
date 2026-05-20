import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class TitleUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'title'>): UserActionEvent;
}
