import * as rt from 'io-ts';
export declare const DocumentResponseRt: rt.ArrayC<rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    index: rt.StringC;
    attached_at: rt.StringC;
}>>>;
export type DocumentResponse = rt.TypeOf<typeof DocumentResponseRt>;
