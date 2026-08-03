import * as rt from 'io-ts';
declare const PageTypeRt: rt.UnionC<[rt.NumberC, rt.Type<number, string, unknown>]>;
type PageNumberType = rt.TypeOf<typeof PageTypeRt>;
export interface Pagination {
    page: PageNumberType;
    perPage: PageNumberType;
}
export declare const PaginationSchemaRt: rt.ExactC<rt.PartialC<{
    page: rt.UnionC<[rt.NumberC, rt.Type<number, string, unknown>]>;
    perPage: rt.UnionC<[rt.NumberC, rt.Type<number, string, unknown>]>;
}>>;
export type PartialPaginationType = Partial<Pagination>;
export {};
