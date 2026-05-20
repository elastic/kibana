import * as t from 'io-ts';
declare const manageSLOParamsSchema: t.TypeC<{
    path: t.TypeC<{
        id: t.Type<string, string, unknown>;
    }>;
}>;
type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;
export { manageSLOParamsSchema };
export type { ManageSLOParams };
