import React from 'react';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
export declare function getConfidenceColor(confidence: number): string;
export declare function getStatusColor(status: Feature['status']): 'success' | 'danger' | 'warning';
interface UseStreamFeaturesTableProps {
    definition: Streams.all.Definition;
    features: Feature[];
    refreshFeatures: () => void;
    isIdentifyingFeatures: boolean;
    selectedFeature: Feature | null;
    onSelectFeature: (feature: Feature | null) => void;
}
export declare function useStreamFeaturesTable({ definition, features, refreshFeatures, isIdentifyingFeatures, selectedFeature, onSelectFeature, }: UseStreamFeaturesTableProps): {
    pagination: {
        pageIndex: number;
        pageSize: number;
    };
    selectedFeatures: ({
        type: string;
        id: string;
        stream_name: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        evidence?: string[] | undefined;
        title?: string | undefined;
        meta?: Record<string, any> | undefined;
        subtype?: string | undefined;
        tags?: string[] | undefined;
    } & {
        status: "stale" | "active" | "expired";
        uuid: string;
        last_seen: string;
        expires_at?: string | undefined;
    })[];
    setSelectedFeatures: React.Dispatch<React.SetStateAction<({
        type: string;
        id: string;
        stream_name: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        evidence?: string[] | undefined;
        title?: string | undefined;
        meta?: Record<string, any> | undefined;
        subtype?: string | undefined;
        tags?: string[] | undefined;
    } & {
        status: "stale" | "active" | "expired";
        uuid: string;
        last_seen: string;
        expires_at?: string | undefined;
    })[]>>;
    isBulkDeleteModalVisible: boolean;
    isIdentifyingFeatures: boolean;
    showBulkDeleteModal: import("@kbn/react-hooks/src/use_boolean").VoidHandler;
    hideBulkDeleteModal: import("@kbn/react-hooks/src/use_boolean").VoidHandler;
    handleDeleteFeature: () => Promise<void>;
    handleBulkDelete: () => Promise<void>;
    clearSelection: () => void;
    handleTableChange: ({ page }: CriteriaWithPagination<Feature>) => void;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    columns: EuiBasicTableColumn<{
        type: string;
        id: string;
        stream_name: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        evidence?: string[] | undefined;
        title?: string | undefined;
        meta?: Record<string, any> | undefined;
        subtype?: string | undefined;
        tags?: string[] | undefined;
    } & {
        status: "stale" | "active" | "expired";
        uuid: string;
        last_seen: string;
        expires_at?: string | undefined;
    }>[];
    items: ({
        type: string;
        id: string;
        stream_name: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        evidence?: string[] | undefined;
        title?: string | undefined;
        meta?: Record<string, any> | undefined;
        subtype?: string | undefined;
        tags?: string[] | undefined;
    } & {
        status: "stale" | "active" | "expired";
        uuid: string;
        last_seen: string;
        expires_at?: string | undefined;
    })[];
    noItemsMessage: string;
};
export declare const FEATURES_LABEL: string;
export declare const TABLE_CAPTION_LABEL: string;
export declare const CLEAR_SELECTION: string;
export declare const DELETE_SELECTED: string;
export {};
