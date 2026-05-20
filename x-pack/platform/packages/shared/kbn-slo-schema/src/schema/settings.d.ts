import * as t from 'io-ts';
declare const storedSloSettingsSchema: t.IntersectionC<[t.TypeC<{
    useAllRemoteClusters: t.BooleanC;
    selectedRemoteClusters: t.ArrayC<t.StringC>;
}>, t.PartialC<{
    staleThresholdInHours: t.NumberC;
    staleInstancesCleanupEnabled: t.BooleanC;
}>]>;
declare const sloSettingsSchema: t.TypeC<{
    useAllRemoteClusters: t.BooleanC;
    selectedRemoteClusters: t.ArrayC<t.StringC>;
    staleThresholdInHours: t.NumberC;
    staleInstancesCleanupEnabled: t.BooleanC;
}>;
declare const serverlessSloSettingsSchema: t.TypeC<{
    staleThresholdInHours: t.NumberC;
    staleInstancesCleanupEnabled: t.BooleanC;
}>;
export { serverlessSloSettingsSchema, sloSettingsSchema, storedSloSettingsSchema };
