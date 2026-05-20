import type { Ecs } from '../../../common';
type Maybe<T> = T | null;
interface Event {
    data: EventNonEcsData[];
    ecs: Ecs;
}
interface EventNonEcsData {
    field: string;
    value?: Maybe<string[]>;
}
export declare function getRuleIdFromEvent(event: Event): {
    id: string;
    name: string;
};
export {};
