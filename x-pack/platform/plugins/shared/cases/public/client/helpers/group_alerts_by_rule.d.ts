import type { Ecs } from '../../../common';
import type { CaseAttachmentsWithoutOwner } from '../../types';
type Maybe<T> = T | null;
interface Event {
    data: EventNonEcsData[];
    ecs: Ecs;
}
interface EventNonEcsData {
    field: string;
    value?: Maybe<string[]>;
}
export type GroupAlertsByRule = (items: Event[]) => CaseAttachmentsWithoutOwner;
export declare const groupAlertsByRule: GroupAlertsByRule;
export {};
