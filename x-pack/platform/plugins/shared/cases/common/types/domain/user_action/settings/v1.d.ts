import * as rt from 'io-ts';
export declare const SettingsUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    settings: rt.PartialC<{
        syncAlerts: rt.BooleanC;
        extractObservables: rt.BooleanC;
    }>;
}>>;
export declare const SettingsUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"settings">;
    payload: rt.ExactC<rt.TypeC<{
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
    }>>;
}>>;
