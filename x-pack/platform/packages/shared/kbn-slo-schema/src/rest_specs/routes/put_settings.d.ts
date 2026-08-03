import * as t from 'io-ts';
import { sloSettingsSchema } from '../../schema/settings';
declare const putSLOSettingsParamsSchema: t.TypeC<{
    body: t.TypeC<{
        useAllRemoteClusters: t.BooleanC;
        selectedRemoteClusters: t.ArrayC<t.StringC>;
        staleThresholdInHours: t.NumberC;
        staleInstancesCleanupEnabled: t.BooleanC;
    }>;
}>;
declare const putSLOServerlessSettingsParamsSchema: t.TypeC<{
    body: t.TypeC<{
        staleThresholdInHours: t.NumberC;
        staleInstancesCleanupEnabled: t.BooleanC;
    }>;
}>;
declare const putSLOSettingsResponseSchema: t.TypeC<{
    useAllRemoteClusters: t.BooleanC;
    selectedRemoteClusters: t.ArrayC<t.StringC>;
    staleThresholdInHours: t.NumberC;
    staleInstancesCleanupEnabled: t.BooleanC;
}>;
type PutSLOSettingsParams = t.TypeOf<typeof putSLOSettingsParamsSchema.props.body>;
type PutServerlessSLOSettingsParams = t.TypeOf<typeof putSLOServerlessSettingsParamsSchema.props.body>;
type PutSLOSettingsResponse = t.OutputOf<typeof putSLOSettingsResponseSchema>;
type GetSLOSettingsResponse = t.OutputOf<typeof sloSettingsSchema>;
export { putSLOServerlessSettingsParamsSchema, putSLOSettingsParamsSchema, putSLOSettingsResponseSchema, };
export type { GetSLOSettingsResponse, PutServerlessSLOSettingsParams, PutSLOSettingsParams, PutSLOSettingsResponse, };
