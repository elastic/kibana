import type { MachineImplementationsFrom } from 'xstate';
import type { LogCategory } from '../../types';
import type { CategoryDetailsServiceDependencies, LogCategoryDetailsParams } from './types';
export declare const categoryDetailsService: import("xstate").StateMachine<{
    parameters: LogCategoryDetailsParams;
    expandedRowIndex: number | null;
    expandedCategory: LogCategory | null;
}, {
    type: "setExpandedCategory";
    rowIndex: number | null;
    category: LogCategory | null;
}, {}, never, {
    type: "storeCategory";
    params: {
        category: LogCategory | null;
        rowIndex: number | null;
    };
}, {
    type: "hasCategory";
    params: {
        expandedCategory: LogCategory | null;
    };
}, never, "idle", string, LogCategoryDetailsParams, {}, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "logCategoryDetails";
    states: {
        readonly idle: {};
    };
}>;
export declare const CategoryDetailsServiceContext: {
    useSelector: <T>(selector: (snapshot: import("xstate").MachineSnapshot<{
        parameters: LogCategoryDetailsParams;
        expandedRowIndex: number | null;
        expandedCategory: LogCategory | null;
    }, {
        type: "setExpandedCategory";
        rowIndex: number | null;
        category: LogCategory | null;
    }, {}, "idle", string, {}, import("xstate").MetaObject, {
        id: "logCategoryDetails";
        states: {
            readonly idle: {};
        };
    }>) => T, compare?: ((a: T, b: T) => boolean) | undefined) => T;
    useActorRef: () => import("xstate").Actor<import("xstate").StateMachine<{
        parameters: LogCategoryDetailsParams;
        expandedRowIndex: number | null;
        expandedCategory: LogCategory | null;
    }, {
        type: "setExpandedCategory";
        rowIndex: number | null;
        category: LogCategory | null;
    }, {}, never, {
        type: "storeCategory";
        params: {
            category: LogCategory | null;
            rowIndex: number | null;
        };
    }, {
        type: "hasCategory";
        params: {
            expandedCategory: LogCategory | null;
        };
    }, never, "idle", string, LogCategoryDetailsParams, {}, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "logCategoryDetails";
        states: {
            readonly idle: {};
        };
    }>>;
    Provider: (props: {
        children: React.ReactNode;
        options?: import("xstate").ActorOptions<import("xstate").StateMachine<{
            parameters: LogCategoryDetailsParams;
            expandedRowIndex: number | null;
            expandedCategory: LogCategory | null;
        }, {
            type: "setExpandedCategory";
            rowIndex: number | null;
            category: LogCategory | null;
        }, {}, never, {
            type: "storeCategory";
            params: {
                category: LogCategory | null;
                rowIndex: number | null;
            };
        }, {
            type: "hasCategory";
            params: {
                expandedCategory: LogCategory | null;
            };
        }, never, "idle", string, LogCategoryDetailsParams, {}, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "logCategoryDetails";
            states: {
                readonly idle: {};
            };
        }>> | undefined;
        machine?: never;
        logic?: import("xstate").StateMachine<{
            parameters: LogCategoryDetailsParams;
            expandedRowIndex: number | null;
            expandedCategory: LogCategory | null;
        }, {
            type: "setExpandedCategory";
            rowIndex: number | null;
            category: LogCategory | null;
        }, {}, never, {
            type: "storeCategory";
            params: {
                category: LogCategory | null;
                rowIndex: number | null;
            };
        }, {
            type: "hasCategory";
            params: {
                expandedCategory: LogCategory | null;
            };
        }, never, "idle", string, LogCategoryDetailsParams, {}, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "logCategoryDetails";
            states: {
                readonly idle: {};
            };
        }> | undefined;
    }) => React.ReactElement<any, any>;
};
export declare const createCategoryDetailsServiceImplementations: ({ search, }: CategoryDetailsServiceDependencies) => MachineImplementationsFrom<typeof categoryDetailsService>;
