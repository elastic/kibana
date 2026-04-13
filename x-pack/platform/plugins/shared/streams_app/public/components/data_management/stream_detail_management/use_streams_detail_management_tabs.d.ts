import { Streams } from '@kbn/streams-schema';
import React from 'react';
export declare function useStreamsDetailManagementTabs({ definition, refreshDefinition, }: {
    definition: Streams.all.GetResponse;
    refreshDefinition: () => void;
}): {
    significantEvents?: {
        content: React.JSX.Element;
        label: string;
    } | undefined;
    processing?: {
        content: React.JSX.Element;
        label: string;
    } | undefined;
    isLoading: boolean;
};
