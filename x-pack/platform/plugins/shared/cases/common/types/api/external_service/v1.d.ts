import * as rt from 'io-ts';
export declare const ExternalServiceResponseRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    title: rt.StringC;
    id: rt.StringC;
    pushedDate: rt.StringC;
    url: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    comments: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        commentId: rt.StringC;
        pushedDate: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        externalCommentId: rt.StringC;
    }>>]>>;
}>>]>;
export type ExternalServiceResponse = rt.TypeOf<typeof ExternalServiceResponseRt>;
