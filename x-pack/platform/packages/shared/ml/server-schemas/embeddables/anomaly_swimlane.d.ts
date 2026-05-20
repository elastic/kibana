import type { TypeOf } from '@kbn/config-schema';
export declare const swimlaneTypeSchema: import("@kbn/config-schema").Type<"overall" | "viewBy">;
export type SwimlaneType = TypeOf<typeof swimlaneTypeSchema>;
export declare const anomalySwimlaneEmbeddableCustomInputViewBySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"viewBy">;
    viewBy: import("@kbn/config-schema").Type<string>;
}>;
export type AnomalySwimlaneEmbeddableCustomInputViewBy = TypeOf<typeof anomalySwimlaneEmbeddableCustomInputViewBySchema>;
export declare const anomalySwimlaneEmbeddableCustomInputOverallSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"overall">;
}>;
export type AnomalySwimlaneEmbeddableCustomInputOverall = TypeOf<typeof anomalySwimlaneEmbeddableCustomInputOverallSchema>;
export declare const anomalySwimlaneEmbeddableCustomInputSchema: import("@kbn/config-schema").Type<Readonly<{
    id?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    filters?: Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined;
    perPage?: number | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    refreshConfig?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
} & {
    jobIds: string[];
    viewBy: string;
    swimlaneType: "viewBy";
}> | Readonly<{
    id?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    filters?: Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined;
    perPage?: number | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    refreshConfig?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
} & {
    jobIds: string[];
    swimlaneType: "overall";
}>>;
export type AnomalySwimlaneEmbeddableCustomInput = TypeOf<typeof anomalySwimlaneEmbeddableCustomInputSchema>;
export declare const anomalySwimlaneEmbeddableUserInputSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"overall" | "viewBy">;
    viewBy: import("@kbn/config-schema").Type<string | undefined>;
    panelTitle: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type AnomalySwimlaneEmbeddableUserInput = TypeOf<typeof anomalySwimlaneEmbeddableUserInputSchema>;
export declare const anomalySwimlanePropsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"overall" | "viewBy">;
    viewBy: import("@kbn/config-schema").Type<string | undefined>;
    panelTitle: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
}>;
export type AnomalySwimlaneProps = TypeOf<typeof anomalySwimlanePropsSchema>;
export declare const anomalySwimlaneInitialInputSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[] | undefined>;
    swimlaneType: import("@kbn/config-schema").Type<"overall" | "viewBy" | undefined>;
    viewBy: import("@kbn/config-schema").Type<string | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
}>;
export type AnomalySwimlaneInitialInput = TypeOf<typeof anomalySwimlaneInitialInputSchema>;
export declare const anomalySwimLaneControlsStateSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"overall" | "viewBy">;
    viewBy: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
}>;
export type AnomalySwimLaneControlsState = TypeOf<typeof anomalySwimLaneControlsStateSchema>;
export declare const anomalySwimlaneEmbeddableStateViewBySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    swimlaneType: import("@kbn/config-schema").Type<"viewBy">;
    viewBy: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type AnomalySwimlaneEmbeddableStateViewBy = TypeOf<typeof anomalySwimlaneEmbeddableStateViewBySchema>;
export declare const anomalySwimLaneEmbeddableStateSchema: import("@kbn/config-schema").Type<Readonly<{
    id?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    title?: string | undefined;
    description?: string | undefined;
    filters?: Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined;
    perPage?: number | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    refreshConfig?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
} & {
    jobIds: string[];
    viewBy: string;
    swimlaneType: "viewBy";
}> | Readonly<{
    id?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    title?: string | undefined;
    description?: string | undefined;
    filters?: Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined;
    perPage?: number | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    refreshConfig?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
} & {
    jobIds: string[];
    swimlaneType: "overall";
}>>;
export type AnomalySwimLaneEmbeddableState = TypeOf<typeof anomalySwimLaneEmbeddableStateSchema>;
