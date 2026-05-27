import * as t from 'io-ts';
declare const deleteSLOInstancesParamsSchema: t.TypeC<{
    body: t.TypeC<{
        list: t.ArrayC<t.IntersectionC<[t.TypeC<{
            sloId: t.Type<string, string, unknown>;
            instanceId: t.StringC;
        }>, t.PartialC<{
            excludeRollup: t.BooleanC;
        }>]>>;
    }>;
}>;
type DeleteSLOInstancesInput = t.OutputOf<typeof deleteSLOInstancesParamsSchema.props.body>;
type DeleteSLOInstancesParams = t.TypeOf<typeof deleteSLOInstancesParamsSchema.props.body>;
export { deleteSLOInstancesParamsSchema };
export type { DeleteSLOInstancesInput, DeleteSLOInstancesParams };
