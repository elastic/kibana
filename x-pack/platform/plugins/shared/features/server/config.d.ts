import { type TypeOf } from '@kbn/config-schema';
export type ConfigType = TypeOf<typeof ConfigSchema>;
export type ConfigOverridesType = Required<ConfigType>['overrides'];
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    overrides: import("@kbn/config-schema").ConditionalType<true, Record<string, Readonly<{
        name?: string | undefined;
        description?: string | null | undefined;
        order?: number | undefined;
        hidden?: boolean | undefined;
        category?: string | undefined;
        privileges?: Readonly<{
            all?: Readonly<{
                disabled?: boolean | undefined;
                composedOf?: Readonly<{} & {
                    feature: string;
                    privileges: string[];
                }>[] | undefined;
            } & {}> | undefined;
            read?: Readonly<{
                disabled?: boolean | undefined;
                composedOf?: Readonly<{} & {
                    feature: string;
                    privileges: string[];
                }>[] | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        subFeatures?: Readonly<{} & {
            privileges: Record<string, Readonly<{
                disabled?: boolean | undefined;
                includeIn?: "all" | "none" | "read" | undefined;
            } & {}>>;
        }> | undefined;
    } & {}>> | undefined, Record<string, Readonly<{
        name?: string | undefined;
        description?: string | null | undefined;
        order?: number | undefined;
        hidden?: boolean | undefined;
        category?: string | undefined;
        privileges?: Readonly<{
            all?: Readonly<{
                disabled?: boolean | undefined;
                composedOf?: Readonly<{} & {
                    feature: string;
                    privileges: string[];
                }>[] | undefined;
            } & {}> | undefined;
            read?: Readonly<{
                disabled?: boolean | undefined;
                composedOf?: Readonly<{} & {
                    feature: string;
                    privileges: string[];
                }>[] | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        subFeatures?: Readonly<{} & {
            privileges: Record<string, Readonly<{
                disabled?: boolean | undefined;
                includeIn?: "all" | "none" | "read" | undefined;
            } & {}>>;
        }> | undefined;
    } & {}>> | undefined>;
}>;
