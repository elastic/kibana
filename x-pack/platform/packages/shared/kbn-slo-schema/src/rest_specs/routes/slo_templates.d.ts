import * as t from 'io-ts';
import type { sloTemplateSchema } from '../../schema';
declare const getSLOTemplateParamsSchema: t.TypeC<{
    path: t.TypeC<{
        templateId: t.StringC;
    }>;
}>;
declare const findSLOTemplatesParamsSchema: t.TypeC<{
    query: t.UnionC<[t.UndefinedC, t.PartialC<{
        search: t.StringC;
        tags: t.Type<string[], string, unknown>;
        page: t.Type<number, number, unknown>;
        perPage: t.Type<number, number, unknown>;
    }>]>;
}>;
type SLOTemplateResponse = t.OutputOf<typeof sloTemplateSchema>;
type GetSLOTemplateResponse = SLOTemplateResponse;
interface FindSLOTemplatesResponse {
    total: number;
    page: number;
    perPage: number;
    results: SLOTemplateResponse[];
}
interface FindSLOTemplateTagsResponse {
    tags: string[];
}
export { findSLOTemplatesParamsSchema, getSLOTemplateParamsSchema };
export type { SLOTemplateResponse, GetSLOTemplateResponse, FindSLOTemplatesResponse, FindSLOTemplateTagsResponse, };
