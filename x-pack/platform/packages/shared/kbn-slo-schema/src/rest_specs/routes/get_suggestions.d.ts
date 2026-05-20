import * as t from 'io-ts';
declare const getSLOSuggestionsResponseSchema: t.TypeC<{
    tags: t.ArrayC<t.TypeC<{
        label: t.StringC;
        value: t.StringC;
        count: t.NumberC;
    }>>;
}>;
type GetSLOSuggestionsResponse = t.OutputOf<typeof getSLOSuggestionsResponseSchema>;
export { getSLOSuggestionsResponseSchema };
export type { GetSLOSuggestionsResponse };
