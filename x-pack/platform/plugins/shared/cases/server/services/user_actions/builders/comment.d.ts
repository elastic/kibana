import { UserActionBuilder } from '../abstract_builder';
import type { UserActionParameters, UserActionEvent } from '../types';
export declare class CommentUserActionBuilder extends UserActionBuilder {
    build(args: UserActionParameters<'comment'>): UserActionEvent;
}
