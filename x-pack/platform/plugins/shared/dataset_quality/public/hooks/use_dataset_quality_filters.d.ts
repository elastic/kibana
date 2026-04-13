import type { OnRefreshChangeProps } from '@elastic/eui';
import type { IntegrationItem } from '../components/dataset_quality/filters/integrations_selector';
import type { NamespaceItem } from '../components/dataset_quality/filters/namespaces_selector';
import type { QualityItem } from '../components/dataset_quality/filters/qualities_selector';
import type { Item } from '../components/dataset_quality/filters/selector';
export declare const useDatasetQualityFilters: () => {
    timeRange: import("../../common/types").TimeRangeConfig;
    onTimeChange: (selectedTime: {
        start: string;
        end: string;
    }) => void;
    onRefresh: () => void;
    onRefreshChange: ({ refreshInterval, isPaused }: Pick<OnRefreshChangeProps, "refreshInterval" | "isPaused">) => void;
    integrations: IntegrationItem[];
    namespaces: NamespaceItem[];
    qualities: QualityItem[];
    types: Item[];
    authorizedDatasetTypes: ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[];
    onIntegrationsChange: (newIntegrationItems: IntegrationItem[]) => void;
    onNamespacesChange: (newNamespaceItems: NamespaceItem[]) => void;
    onQualitiesChange: (newQualityItems: QualityItem[]) => void;
    onTypesChange: (newTypeItems: Item[]) => void;
    isLoading: boolean;
    selectedQuery: string | undefined;
    onQueryChange: (query: string) => void;
    isDatasetQualityAllSignalsAvailable: boolean;
};
