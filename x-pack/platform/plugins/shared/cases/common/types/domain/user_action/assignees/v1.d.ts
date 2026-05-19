import * as rt from 'io-ts';
export declare const AssigneesUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
}>>;
export declare const AssigneesUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"assignees">;
    payload: rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
    }>>;
}>>;
