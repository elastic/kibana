import type { Observable } from 'rxjs';
import type { PluginInitializerContext } from '@kbn/core/server';
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    maxSpaces: import("@kbn/config-schema").Type<number>;
    allowFeatureVisibility: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    allowSolutionVisibility: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    defaultSolution: import("@kbn/config-schema").Type<"security" | "oblt" | "es" | undefined>;
}>;
export declare function createConfig$(context: PluginInitializerContext): Observable<Readonly<{
    defaultSolution?: "security" | "oblt" | "es" | undefined;
} & {
    enabled: boolean;
    maxSpaces: number;
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
}>>;
export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P> ? P : ReturnType<typeof createConfig$>;
